import json
import logging
import os
import sys
import types
import uuid
from pathlib import Path
from typing import Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# Vercel Services executes this file from inside the backend directory. Create a
# lightweight package alias so existing backend.* imports work in both layouts.
if "backend" not in sys.modules and (Path(__file__).resolve().parent / "agents").exists():
    backend_package = types.ModuleType("backend")
    backend_package.__path__ = [str(Path(__file__).resolve().parent)]
    sys.modules["backend"] = backend_package

from backend.agents.orchestrator import run_agents
from backend.agents.sarvam_client import SARVAM_MODEL, SARVAM_URL, get_api_key, is_usable_api_key
from backend.graph.analyzer import build_and_analyze
from backend.graph.neo4j_client import Neo4jClient
from backend.parser.iam_parser import parse_iam_policy
from backend.parser.k8s_parser import parse_k8s_rbac


load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vektra.main")

app = FastAPI(title="VEKTRA API", version="1.0.0")
neo4j_client = Neo4jClient()

FRONTEND_ORIGINS = [
    "https://vektra-six.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if os.getenv("FRONTEND_URL"):
    FRONTEND_ORIGINS.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    policy_text: str
    format: str
    session_id: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    policy_context: str = ""
    session_id: Optional[str] = None
    history: List[Dict[str, str]] = Field(default_factory=list)


@app.on_event("startup")
async def startup_event():
    await neo4j_client.connect()


@app.on_event("shutdown")
async def shutdown_event():
    await neo4j_client.close()


@app.get("/api/health")
async def health_check(x_sarvam_api_key: Optional[str] = Header(None)):
    return {
        "status": "ok",
        "neo4j": await neo4j_client.ping(),
        "sarvam": is_usable_api_key(x_sarvam_api_key) or is_usable_api_key(os.getenv("SARVAM_API_KEY")),
    }


app.add_api_route("/health", health_check, methods=["GET"])


@app.post("/api/analyze")
async def analyze_policy(
    request: AnalyzeRequest,
    x_sarvam_api_key: Optional[str] = Header(None),
):
    policy_format = request.format.lower()
    if policy_format not in {"iam", "k8s"}:
        raise HTTPException(status_code=400, detail="Invalid format. Supported formats are 'iam' and 'k8s'.")

    session_id = request.session_id or str(uuid.uuid4())

    try:
        rules = parse_iam_policy(request.policy_text) if policy_format == "iam" else parse_k8s_rbac(request.policy_text)
    except Exception as exc:
        logger.exception("Policy parsing failed.")
        raise HTTPException(status_code=400, detail=f"Failed to parse policy: {exc}") from exc

    if not rules:
        raise HTTPException(status_code=400, detail="No valid statements or rules detected in policy content.")

    try:
        analysis_result = build_and_analyze(rules, format=policy_format)
    except Exception as exc:
        logger.exception("Graph analysis failed.")
        raise HTTPException(status_code=500, detail=f"Graph analysis failed: {exc}") from exc

    await neo4j_client.clear_session(session_id)
    await neo4j_client.write_rules(analysis_result.rules, session_id)
    await neo4j_client.write_edges(analysis_result.edges, session_id)
    critical_paths = await neo4j_client.find_critical_paths(session_id)

    try:
        enriched_vulnerabilities, risk_data = await run_agents(
            analysis_result.conflicts,
            request.policy_text,
            format=policy_format,
            api_key=x_sarvam_api_key,
            rules=analysis_result.rules,
        )
    except Exception as exc:
        logger.exception("Agent orchestration failed.")
        enriched_vulnerabilities = [vuln.model_dump() for vuln in analysis_result.conflicts]
        risk_data = {
            "risk_score": 0,
            "risk_label": "LOW",
            "executive_summary": "Graph analysis completed, but Sarvam agents could not enrich the result.",
            "top_3_priorities": ["Review detected graph vulnerabilities manually."],
            "top_priorities": ["Review detected graph vulnerabilities manually."],
            "compliance_notes": "",
        }

    critical_count = sum(1 for vuln in enriched_vulnerabilities if vuln.get("severity") == "CRITICAL")
    warning_count = sum(1 for vuln in enriched_vulnerabilities if vuln.get("severity") == "WARNING")
    info_count = sum(1 for vuln in enriched_vulnerabilities if vuln.get("severity") == "INFO")

    stats = {
        "total_rules": len(analysis_result.rules),
        "vulnerabilities_found": len(enriched_vulnerabilities),
        "conflicts_found": critical_count,
        "critical_count": critical_count,
        "warnings_found": warning_count,
        "warning_count": warning_count,
        "info_count": info_count,
        "most_dangerous_rule": analysis_result.most_dangerous_rule,
        "risk_score": risk_data.get("risk_score", 0),
        "risk_label": risk_data.get("risk_label", "LOW"),
        "executive_summary": risk_data.get("executive_summary", ""),
        "top_3_priorities": risk_data.get("top_3_priorities", []),
        "top_priorities": risk_data.get("top_priorities", risk_data.get("top_3_priorities", [])),
        "compliance_notes": risk_data.get("compliance_notes", ""),
    }

    return {
        "session_id": session_id,
        "format": policy_format,
        "nodes": [rule.model_dump() for rule in analysis_result.rules],
        "edges": [edge.model_dump() for edge in analysis_result.edges],
        "vulnerabilities": enriched_vulnerabilities,
        "conflicts": enriched_vulnerabilities,
        "critical_paths": critical_paths,
        "risk_assessment": risk_data,
        "stats": stats,
    }


app.add_api_route("/analyze", analyze_policy, methods=["POST"])


@app.post("/api/chat")
async def chat_sse(
    request: ChatRequest,
    x_sarvam_api_key: Optional[str] = Header(None),
):
    sarvam_key = get_api_key(x_sarvam_api_key)
    if not sarvam_key:
        raise HTTPException(status_code=400, detail="No Sarvam API key supplied. Set SARVAM_API_KEY or save one in Settings.")

    history_messages = []
    for item in request.history[-8:]:
        role = item.get("role", "user")
        if role in {"user", "assistant"} and item.get("content"):
            history_messages.append({"role": role, "content": item["content"]})

    messages = [
        {
            "role": "system",
            "content": (
                "You are VEKTRA's security assistant. Answer concisely about AWS IAM "
                f"and Kubernetes RBAC policy risk. Policy context: {request.policy_context[:1500]}"
            ),
        },
        *history_messages,
        {"role": "user", "content": request.message},
    ]

    async def stream():
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST",
                    SARVAM_URL,
                    headers={
                        "api-subscription-key": sarvam_key,
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": SARVAM_MODEL,
                        "temperature": 0.2,
                        "stream": True,
                        "messages": messages,
                    },
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        payload = line.removeprefix("data: ").strip()
                        if payload == "[DONE]":
                            break
                        try:
                            data = json.loads(payload)
                            delta = data.get("choices", [{}])[0].get("delta", {}).get("content")
                            if delta:
                                yield f"data: {json.dumps({'response': delta})}\n\n"
                        except json.JSONDecodeError:
                            yield f"data: {json.dumps({'response': payload})}\n\n"
        except Exception as exc:
            logger.warning("Sarvam chat stream failed: %s", exc)
            yield f"data: {json.dumps({'response': f'\\n[Error streaming from Sarvam: {exc}]'})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


app.add_api_route("/chat", chat_sse, methods=["POST"])
