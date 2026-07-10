import asyncio
import json
import logging
import os
import sys
import types
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel


def _ensure_backend_package_importable():
    try:
        import backend  # noqa: F401
        return
    except ModuleNotFoundError:
        package = types.ModuleType("backend")
        package.__path__ = [str(Path(__file__).resolve().parent)]
        sys.modules["backend"] = package


_ensure_backend_package_importable()

from backend.auth import create_token, get_current_user, hash_password, verify_password
from backend.agents.orchestrator import run_agents
from backend.agents.sarvam_client import SARVAM_MODEL, SARVAM_URL
from backend.graph.analyzer import build_and_analyze
from backend.graph.neo4j_client import Neo4jClient
from backend.parser.iam_parser import parse_iam_policy
from backend.parser.k8s_parser import parse_k8s_rbac
from backend import workflow_steps
from backend.base44_client import (
    save_scan_history,
    save_report,
    get_scan_history,
    get_saved_report
)
from backend import stellar_client
from backend.credits import check_and_deduct_credits, CREDIT_COSTS, DAILY_CREDITS
from backend.agents.rag_engine import global_rag_engine
from backend.agents.forensics_agents import run_forensic_pipeline


load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vektra.main")

app = FastAPI(title="VEKTRA API", version="1.0.0", servers=[{"url": "/"}])
neo4j_client = Neo4jClient()
neo4j_verify_task: Optional[asyncio.Task] = None


class ApiPrefixMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            if not path.startswith("/api") and not any(path.startswith(x) for x in ["/docs", "/openapi.json", "/redoc", "/favicon.ico"]):
                scope["path"] = "/api" + path
                if "raw_path" in scope:
                    scope["raw_path"] = b"/api" + scope["raw_path"]
        await self.app(scope, receive, send)


def schedule_neo4j_verify() -> Optional[asyncio.Task]:
    global neo4j_verify_task
    if neo4j_client.connected or not neo4j_client.driver:
        return None
    if neo4j_verify_task and not neo4j_verify_task.done():
        return neo4j_verify_task
    neo4j_verify_task = asyncio.create_task(neo4j_client.verify_connection_async())
    return neo4j_verify_task

@app.on_event("startup")
async def startup_event():
    # Warm Neo4j in the background so serverless startup stays responsive.
    schedule_neo4j_verify()
    # Inject shared neo4j client into workflow_steps so all steps use one connection
    workflow_steps.neo4j = neo4j_client


async def ensure_neo4j_ready(timeout: float = 6.0) -> bool:
    if neo4j_client.connected:
        return True
    if not neo4j_client.driver:
        return False
    task = schedule_neo4j_verify()
    if not task:
        return False
    try:
        return await asyncio.wait_for(asyncio.shield(task), timeout=timeout)
    except asyncio.TimeoutError:
        logger.warning("Neo4j connection verification timed out after %.1fs.", timeout)
    except Exception as exc:
        logger.warning("Neo4j connection verification failed: %s", exc)
    return False


app.add_middleware(ApiPrefixMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    policy_text: str
    format: str
    session_id: Optional[str] = None


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ChatRequest(BaseModel):
    message: str
    policy_context: str = ""
    session_id: Optional[str] = None
    history: List[Dict[str, str]] = []


class ForensicFile(BaseModel):
    filename: str
    content: str


class ForensicInvestigateRequest(BaseModel):
    files: List[ForensicFile]


class RAGSearchRequest(BaseModel):
    query: str


class CopilotExecuteRequest(BaseModel):
    prompt: str


class ProfileUpdateRequest(BaseModel):
    name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountRequest(BaseModel):
    confirm: str


class NotificationsRequest(BaseModel):
    preferences: dict


class UpgradeRequest(BaseModel):
    plan: str


class RerunRequest(BaseModel):
    session_id: str
    policy_text: str
    format: str



LOCKED_FEATURES = [
    "AI danger analysis",
    "Auto fix generation",
    "Risk score",
    "Compliance notes",
]


def public_user(user: dict) -> dict:
    return {
        "id": user.get("id"),
        "name": user.get("name"),
        "email": user.get("email"),
        "tier": user.get("tier", "free"),
        "scans_today": user.get("scans_today", 0),
        "last_scan_date": user.get("last_scan_date"),
        "created_at": user.get("created_at"),
        "stellar_public_key": user.get("stellar_public_key"),
        "credits_balance": user.get("credits_balance", 0),
        "notification_preferences": user.get("notification_preferences"),
    }


async def resolve_request_user(request: Request, required: bool = False) -> dict | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header:
        if required:
            raise HTTPException(status_code=401, detail="Authentication required.")
        return None

    claims = get_current_user(request)
    if not claims:
        raise HTTPException(status_code=401, detail="Session expired, please sign in.")

    await ensure_neo4j_ready()
    user = await neo4j_client.get_user_by_id(claims["user_id"])
    if user:
        return user
    if required:
        raise HTTPException(status_code=401, detail="User account not found.")
    return {
        "id": claims["user_id"],
        "email": claims.get("email"),
        "name": claims.get("email", "VEKTRA User").split("@")[0],
        "tier": claims.get("tier", "free"),
    }


@app.get("/api/health")
async def health_check():
    neo4j_ok = neo4j_client.connected or await ensure_neo4j_ready(timeout=6.0)
    base44_ok = bool(os.getenv("BASE44_API_KEY") and os.getenv("BASE44_APP_ID"))
    return {
        "status": "ok",
        "neo4j": neo4j_ok,
        "sarvam": bool(os.getenv("SARVAM_API_KEY")),
        "base44": base44_ok,
    }


app.add_api_route("/health", health_check, methods=["GET"])


ANONYMOUS_LIMIT = 3
anonymous_scans = {}


@app.post("/api/auth/register")
async def register(body: RegisterRequest):
    name = body.name.strip()
    email = body.email.strip().lower()
    password = body.password

    if not name:
        raise HTTPException(status_code=400, detail="Name is required.")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    await ensure_neo4j_ready()
    existing = await neo4j_client.get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered.")

    # Create Stellar wallet and setup trustlines/tokens
    try:
        wallet = await stellar_client.create_user_wallet()
        public_key = wallet["public_key"]
        secret_key = wallet["secret_key"]
        
        await stellar_client.setup_user_trustlines(public_key, secret_key)
        await stellar_client.mint_tier_nft(public_key, "team")
        await stellar_client.issue_credits(public_key, 1000)
    except Exception as exc:
        logger.exception("Failed to initialize user Stellar wallet. Using mock fallback keys.")
        public_key = "G" + str(uuid.uuid4()).replace("-", "")[:55]
        secret_key = "S" + str(uuid.uuid4()).replace("-", "")[:55]

    try:
        created = await neo4j_client.create_user(
            {
                "name": name,
                "email": email,
                "password_hash": hash_password(password),
                "stellar_public_key": public_key,
                "stellar_secret_key": secret_key,
                "credits_balance": 1000,
                "tier": "team",
            }
        )
    except Exception as exc:
        logger.exception("User registration failed.")
        raise HTTPException(status_code=503, detail="User storage is unavailable.") from exc

    token = create_token(created["id"], created["email"], created.get("tier", "free"))
    return {"user": public_user(created), "token": token}


@app.post("/api/auth/login")
async def login(body: LoginRequest):
    email = body.email.strip().lower()
    await ensure_neo4j_ready()
    user = await neo4j_client.get_user_by_email(email)
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    # Fetch live wallet balance from Stellar & sync to Neo4j
    if user.get("stellar_public_key") and not user["stellar_public_key"].startswith("G"):
        try:
            balance_data = await stellar_client.get_wallet_balance(user["stellar_public_key"])
            credits_val = balance_data.get("credits", 0)
            nft_tier = balance_data.get("nft_tier", "free")
            
            if credits_val != user.get("credits_balance") or nft_tier != user.get("tier"):
                user["credits_balance"] = credits_val
                user["tier"] = nft_tier
                await neo4j_client.update_credits(user["id"], credits_val)
                await neo4j_client.update_user_tier(user["id"], nft_tier)
        except Exception:
            logger.warning("Stellar balance sync failed during login.")

    token = create_token(user["id"], user["email"], user.get("tier", "free"))
    return {"user": public_user(user), "token": token}


@app.get("/api/auth/me")
async def me(http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    
    # Sync wallet balance from Stellar
    if user.get("stellar_public_key") and not user["stellar_public_key"].startswith("G"):
        try:
            balance_data = await stellar_client.get_wallet_balance(user["stellar_public_key"])
            credits_val = balance_data.get("credits", 0)
            nft_tier = balance_data.get("nft_tier", "free")
            
            if credits_val != user.get("credits_balance") or nft_tier != user.get("tier"):
                user["credits_balance"] = credits_val
                user["tier"] = nft_tier
                await neo4j_client.update_credits(user["id"], credits_val)
                await neo4j_client.update_user_tier(user["id"], nft_tier)
        except Exception:
            pass

    return {"user": public_user(user)}


@app.post("/api/auth/logout")
async def logout():
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze_policy(
    body: AnalyzeRequest,
    http_request: Request,
    x_sarvam_api_key: Optional[str] = Header(None),
):
    policy_format = body.format.lower()
    if policy_format not in {"iam", "k8s"}:
        raise HTTPException(status_code=400, detail="Invalid format. Supported formats are 'iam' and 'k8s'.")

    user = await resolve_request_user(http_request, required=False)
    
    today_str = date.today().isoformat()
    tier = (user.get("tier") if user else "free") or "free"
    
    # Enforce scan limit & check credits
    if not user:
        client_ip = http_request.client.host if http_request.client else "unknown"
        ip_key = (client_ip, today_str)
        count = anonymous_scans.get(ip_key, 0)
        if count >= ANONYMOUS_LIMIT:
            raise HTTPException(status_code=429, detail="Anonymous daily scan limit reached. Please register or sign in.")
        anonymous_scans[ip_key] = count + 1
    else:
        # Enforce free tier max scans / day
        scans_today = int(user.get("scans_today") or 0)
        last_scan_date = user.get("last_scan_date")
        if tier == "free" and last_scan_date == today_str and scans_today >= 3:
            raise HTTPException(status_code=429, detail="Daily scan limit reached. Upgrade to Pro.")

        # Deduct credits
        action_type = "full_scan" if tier in {"pro", "team"} else "basic_scan"
        deduct_res = await check_and_deduct_credits(user, action_type, neo4j_client)
        if not deduct_res["allowed"]:
            raise HTTPException(status_code=429, detail=deduct_res.get("error", "Insufficient credits."))

    session_id = body.session_id or str(uuid.uuid4())

    try:
        rules = parse_iam_policy(body.policy_text) if policy_format == "iam" else parse_k8s_rbac(body.policy_text)
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

    await ensure_neo4j_ready(timeout=6.0)
    neo4j_client.clear_session(session_id)
    neo4j_client.write_rules(analysis_result.rules, session_id)
    neo4j_client.write_edges(analysis_result.edges, session_id)
    critical_paths = neo4j_client.find_critical_paths(session_id)

    run_full_agents = tier in {"pro", "team"}
    if not run_full_agents:
        enriched_vulnerabilities = [vuln.model_dump() for vuln in analysis_result.conflicts]
        risk_data = {
            "risk_score": 0,
            "risk_label": "LOW",
            "executive_summary": "Basic graph scan complete. Upgrade to Pro to unlock AI danger analysis, fix generation, risk scoring, and compliance notes.",
            "top_3_priorities": ["Upgrade to Pro to unlock AI-powered recommendations."],
            "top_priorities": ["Upgrade to Pro to unlock AI-powered recommendations."],
            "compliance_notes": "",
        }
    else:
        try:
            enriched_vulnerabilities, risk_data = await run_agents(
                analysis_result.conflicts,
                body.policy_text,
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
        "tier": tier,
        "upgrade_prompt": not run_full_agents,
        "locked_features": LOCKED_FEATURES if not run_full_agents else [],
    }

    user_id = user.get("id") if user else None
    await neo4j_client.upsert_scan_session(
        session_id,
        policy_format,
        stats,
        body.policy_text,
        user_id=user_id,
    )
    if user_id:
        await neo4j_client.increment_scan_count(user_id)
        await neo4j_client.link_session_to_user(user_id, session_id)

    # Save to Base44 (non-blocking)
    asyncio.create_task(
        save_scan_history(session_id, policy_format, stats, body.policy_text)
    )

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
        "tier": tier,
        "upgrade_prompt": not run_full_agents,
        "locked_features": LOCKED_FEATURES if not run_full_agents else [],
    }


app.add_api_route("/analyze", analyze_policy, methods=["POST"])


@app.post("/api/analyze/rerun")
async def rerun_analysis(
    body: RerunRequest,
    http_request: Request,
    x_sarvam_api_key: Optional[str] = Header(None),
):
    user = await resolve_request_user(http_request, required=True)
    tier = user.get("tier", "free")
    
    # Check and deduct credits (cost is 2 credits for rerun_agents)
    deduct_res = await check_and_deduct_credits(user, "rerun_agents", neo4j_client)
    if not deduct_res["allowed"]:
        raise HTTPException(status_code=429, detail=deduct_res.get("error", "Insufficient credits."))

    policy_format = body.format.lower()
    if policy_format not in {"iam", "k8s"}:
        raise HTTPException(status_code=400, detail="Invalid format. Supported formats are 'iam' and 'k8s'.")

    try:
        rules = parse_iam_policy(body.policy_text) if policy_format == "iam" else parse_k8s_rbac(body.policy_text)
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

    neo4j_client.clear_session(body.session_id)
    neo4j_client.write_rules(analysis_result.rules, body.session_id)
    neo4j_client.write_edges(analysis_result.edges, body.session_id)
    critical_paths = neo4j_client.find_critical_paths(body.session_id)

    try:
        enriched_vulnerabilities, risk_data = await run_agents(
            analysis_result.conflicts,
            body.policy_text,
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
        "tier": tier,
        "upgrade_prompt": False,
        "locked_features": [],
    }

    await neo4j_client.upsert_scan_session(
        body.session_id,
        policy_format,
        stats,
        body.policy_text,
        user_id=user["id"],
    )
    await neo4j_client.increment_scan_count(user["id"])
    await neo4j_client.link_session_to_user(user["id"], body.session_id)

    # Save to Base44 (non-blocking)
    asyncio.create_task(
        save_scan_history(body.session_id, policy_format, stats, body.policy_text)
    )

    return {
        "session_id": body.session_id,
        "format": policy_format,
        "nodes": [rule.model_dump() for rule in analysis_result.rules],
        "edges": [edge.model_dump() for edge in analysis_result.edges],
        "vulnerabilities": enriched_vulnerabilities,
        "conflicts": enriched_vulnerabilities,
        "critical_paths": critical_paths,
        "risk_assessment": risk_data,
        "stats": stats,
        "tier": tier,
        "upgrade_prompt": False,
        "locked_features": [],
    }



@app.post("/api/chat")
async def chat_sse(
    request: ChatRequest,
    x_sarvam_api_key: Optional[str] = Header(None),
):
    sarvam_key = x_sarvam_api_key or os.getenv("SARVAM_API_KEY")
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
                        "Authorization": f"Bearer {sarvam_key}",
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
                            choices = data.get("choices")
                            if choices:
                                delta = choices[0].get("delta", {}).get("content")
                                if delta:
                                    yield f"data: {json.dumps({'response': delta})}\n\n"
                        except json.JSONDecodeError:
                            yield f"data: {json.dumps({'response': payload})}\n\n"
        except Exception as exc:
            logger.warning("Sarvam chat stream failed: %s", exc)
            error_msg = "\n[Error streaming from Sarvam: " + str(exc) + "]"
            yield f"data: {json.dumps({'response': error_msg})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


app.add_api_route("/chat", chat_sse, methods=["POST"])


# ============================================================================
# WORKFLOW INTERNAL STEP ENDPOINTS
# ============================================================================

@app.post("/api/internal/parse")
async def internal_parse(body: dict):
    return await workflow_steps.step_parse(body)


@app.post("/api/internal/build-graph")
async def internal_build_graph(body: dict):
    return await workflow_steps.step_build_graph(body)


@app.post("/api/internal/save-graph")
async def internal_save_graph(body: dict):
    return await workflow_steps.step_save_graph(body)


@app.post("/api/internal/save-history")
async def internal_save_history(body: dict):
    return await workflow_steps.step_save_history(body)


@app.post("/api/internal/run-analysts")
async def internal_run_analysts(body: dict):
    return await workflow_steps.step_run_analysts(body)


@app.post("/api/internal/run-fixes")
async def internal_run_fixes(body: dict):
    return await workflow_steps.step_run_fixes(body)


@app.post("/api/internal/run-scorer")
async def internal_run_scorer(body: dict):
    return await workflow_steps.step_run_scorer(body)


@app.post("/api/internal/finalize")
async def internal_finalize(body: dict):
    return await workflow_steps.step_finalize(body)


# ============================================================================
# WORKFLOW TRIGGER AND STATUS ENDPOINTS
# ============================================================================

@app.post("/api/workflow/analyze")
async def trigger_workflow(body: dict):
    session_id = body.get("session_id", str(uuid.uuid4()))

    # Ensure neo4j is injected into workflow_steps (idempotent)
    workflow_steps.neo4j = neo4j_client

    # Store initial payload in Neo4j
    await neo4j_client.save_workflow_state(
        session_id,
        "workflow-trigger",
        "started",
        {
            "format": body.get("format", ""),
            "policy_length": len(body.get("policy_text", "")),
            "triggered_at": datetime.now().isoformat(),
        },
        0,
    )

    try:
        # Step 1: Parse policy
        await workflow_steps.step_parse(body)

        # Step 2: Build graph (depends on step 1)
        await workflow_steps.step_build_graph({"session_id": session_id})

        # Steps 3A + 3B: Run SIMULTANEOUSLY — Neo4j save and Base44 history
        await asyncio.gather(
            workflow_steps.step_save_graph({"session_id": session_id}),
            workflow_steps.step_save_history({"session_id": session_id}),
            return_exceptions=True,  # don't let Base44 failure kill Neo4j save
        )

        # Step 4: Run all vulnerability analysts in parallel (internal to step)
        await workflow_steps.step_run_analysts({"session_id": session_id})

        # Step 5: Run all fix engineers in parallel (CRITICAL + WARNING only)
        await workflow_steps.step_run_fixes(
            {"session_id": session_id, "policy_text": body.get("policy_text", "")}
        )

        # Step 6: Risk scorer (depends on step 5)
        await workflow_steps.step_run_scorer({"session_id": session_id})

        # Step 7: Finalize — aggregates all previous outputs
        await workflow_steps.step_finalize(
            {"session_id": session_id, "user_id": body.get("user_id")}
        )

    except Exception as e:
        logger.exception("Workflow execution failed")
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "session_id": session_id,
        "workflow_triggered": True,
        "status_url": f"/api/workflow/status/{session_id}",
    }


@app.get("/api/workflow/status/{session_id}")
async def workflow_status(session_id: str):
    state = await neo4j_client.get_workflow_state(session_id)

    steps_complete = [k for k, v in state.items() if v["status"] == "complete"]
    steps_failed = [k for k, v in state.items() if v["status"] == "failed"]

    all_steps = [
        "step-1-parse",
        "step-2-graph",
        "step-3-neo4j",
        "step-3-base44",
        "step-4-agents",
        "step-5-fixes",
        "step-6-score",
        "step-7-finalize",
    ]

    is_complete = "step-7-finalize" in steps_complete

    # If complete, return full result
    result = None
    if is_complete:
        final_step = state.get("step-7-finalize", {})
        result = final_step.get("output")

    return {
        "session_id": session_id,
        "is_complete": is_complete,
        "is_failed": len(steps_failed) > 0,
        "steps_complete": steps_complete,
        "steps_failed": steps_failed,
        "total_steps": len(all_steps),
        "progress_pct": int(len(steps_complete) / len(all_steps) * 100),
        "step_timings": {k: v["duration_ms"] for k, v in state.items()},
        "result": result,
    }


@app.post("/api/report/save")
async def save_report_endpoint(body: dict):
    session_id = body["session_id"]
    report_data = body["report_data"]
    title = body.get("title", f"Scan {session_id[:8]}")
    await save_report(session_id, report_data, title)
    return {"status": "saved"}


@app.get("/api/history")
async def get_history(http_request: Request):
    user = await resolve_request_user(http_request, required=False)
    if user:
        neo4j_history = await neo4j_client.get_user_scan_history(user["id"], limit=50)
        if neo4j_history:
            return {"history": neo4j_history}
    history = await get_scan_history(limit=10)
    return {"history": history}


@app.get("/api/report/{session_id}")
async def get_report(session_id: str):
    report = await get_saved_report(session_id)
    if not report:
        return JSONResponse(status_code=404, content={"error": "Report not found"})
    return report


@app.get("/api/wallet")
async def get_wallet(http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    try:
        balance_data = await stellar_client.get_wallet_balance(user["stellar_public_key"])
        credits_val = balance_data.get("credits", 0)
        nft_tier = balance_data.get("nft_tier", "free")
        
        # Sync Neo4j
        if credits_val != user.get("credits_balance") or nft_tier != user.get("tier"):
            user["credits_balance"] = credits_val
            user["tier"] = nft_tier
            await neo4j_client.update_credits(user["id"], credits_val)
            await neo4j_client.update_user_tier(user["id"], nft_tier)
    except Exception:
        balance_data = {
            "credits": user.get("credits_balance", 0),
            "nft_tier": user.get("tier", "free"),
            "xlm": 0,
            "public_key": user.get("stellar_public_key")
        }

    return {
        "public_key": balance_data["public_key"],
        "credits": balance_data["credits"],
        "nft_tier": balance_data["nft_tier"],
        "xlm": balance_data["xlm"],
        "credit_costs": CREDIT_COSTS,
        "daily_allowance": DAILY_CREDITS.get(balance_data["nft_tier"], 5),
        "reset_time": "midnight IST"
    }


@app.post("/api/wallet/upgrade")
async def upgrade_wallet(body: UpgradeRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    plan = body.plan.lower()
    if plan not in {"free", "pro", "team"}:
        raise HTTPException(status_code=400, detail="Invalid plan selected.")
    
    # Update user tier in Neo4j
    await neo4j_client.update_user_tier(user["id"], plan)
    
    # Add monthly/tier credits
    added_credits = DAILY_CREDITS.get(plan, 5)
    new_credits = user.get("credits_balance", 0) + added_credits
    await neo4j_client.update_credits(user["id"], new_credits)
    
    # Mint tier NFT and issue credits on Stellar Horizon in background
    if user.get("stellar_public_key") and not user["stellar_public_key"].startswith("G"):
        try:
            await stellar_client.mint_tier_nft(user["stellar_public_key"], plan)
            await stellar_client.issue_credits(user["stellar_public_key"], added_credits)
        except Exception as exc:
            logger.exception("Failed to issue assets on Stellar Horizon during upgrade.")

    return {
        "status": "success",
        "tier": plan,
        "credits": new_credits
    }


@app.get("/api/wallet/transactions")
async def get_wallet_transactions(http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    public_key = user.get("stellar_public_key")
    if not public_key:
        return {"transactions": []}

    try:
        url = f"https://horizon-testnet.stellar.org/accounts/{public_key}/payments?limit=20&order=desc"
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(url)
            res.raise_for_status()
            data = res.json()
            
            transactions = []
            for record in data.get("_embedded", {}).get("records", []):
                tx_type = "credits_issued"
                amount = float(record.get("amount", 0))
                asset_code = record.get("asset_code")
                from_addr = record.get("from")
                
                if asset_code == "VEKTRACRED":
                    if from_addr == public_key:
                        tx_type = "credits_spent"
                    else:
                        tx_type = "credits_issued"
                elif asset_code in {"VEKTRAFREE", "VEKTRAPRO", "VEKTRATEAM"}:
                    tx_type = "nft_minted"
                else:
                    continue

                transactions.append({
                    "type": tx_type,
                    "amount": int(amount) if amount.is_integer() else amount,
                    "memo": record.get("paging_token", "Horizon Payment"),
                    "created_at": record.get("created_at"),
                    "tx_hash": record.get("transaction_hash"),
                    "stellar_explorer_url": f"https://stellar.expert/explorer/testnet/tx/{record.get('transaction_hash')}"
                })
            return {"transactions": transactions}
    except Exception as exc:
        logger.warning("Failed to fetch Stellar transactions: %s", exc)
        return {"transactions": []}


@app.post("/api/forensics/investigate")
async def forensics_investigate(body: ForensicInvestigateRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    global_rag_engine.clear()
    for f in body.files:
        global_rag_engine.add_document(f.content, f.filename)
    
    sarvam_key = os.getenv("SARVAM_API_KEY")
    evidence_data = [{"filename": f.filename, "content": f.content} for f in body.files]
    state = await run_forensic_pipeline(evidence_data, api_key=sarvam_key)
    
    await ensure_neo4j_ready()
    entities = state.evidence_output.get("extracted_entities", {})
    await neo4j_client.save_forensic_nodes(state.id, entities)
    
    return {
        "session_id": state.id,
        "planner": state.planner_output,
        "evidence": state.evidence_output,
        "timeline": state.timeline_output,
        "risk": state.risk_output,
        "report": state.report_output
    }


@app.post("/api/forensics/search")
async def forensics_search(body: RAGSearchRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    results = global_rag_engine.search(body.query, top_k=3)
    return {"results": results}


@app.post("/api/copilot/execute")
async def copilot_execute(body: CopilotExecuteRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    prompt_clean = body.prompt.strip().lower()
    
    if prompt_clean.startswith("/search"):
        query = body.prompt[7:].strip()
        results = global_rag_engine.search(query, top_k=2)
        if not results:
            return {"response": f"RAG returned no matches for: {query}"}
        resp = "Here are the top matches from our RAG semantic store:\n\n"
        for idx, res in enumerate(results):
            resp += f"**[{idx+1}] Source: {res['source']} (Confidence: {res['confidence_score']}%):**\n"
            resp += f"> {res['text']}\n\n"
        return {"response": resp}
        
    elif prompt_clean.startswith("/timeline"):
        return {
            "response": "Here is the latest chronological event overview:\n\n"
            "1. **2026-07-09T14:30:00Z**: DevUser created new Access Key (Routine deployment check).\n"
            "2. **2026-07-09T14:35:00Z**: Role assumption from external IP: 54.210.12.33 (AdminsRole).\n"
            "3. **2026-07-09T14:38:00Z**: CRITICAL - Created privilege escalation path version (AdminsRole)."
        }
        
    elif prompt_clean.startswith("/remediate"):
        return {
            "response": "To resolve the privilege escalation risk on AdminsRole, apply these two policy boundaries:\n\n"
            "1. **Restrict Version Creation**: Disallow `iam:CreatePolicyVersion` actions unless strict approvals are met.\n"
            "2. **IP Whitelisting**: Add `aws:SourceIp` check values inside role policy trust policies to ensure actions only occur from registered VPC endpoints."
        }
        
    elif prompt_clean.startswith("/report"):
        return {
            "response": "Summary Report of the latest Forensic Investigation Case:\n\n"
            "- **Threat Score**: 88/100 (CRITICAL)\n"
            "- **Anomalies**: Access from external IP 54.210.12.33, rapid role assumptions.\n"
            "- **Recommendations**: IP whitelisting conditions, credential rotation, compliance anchoring on Stellar ledger."
        }
        
    sarvam_key = os.getenv("SARVAM_API_KEY")
    system_prompt = "You are Vektra's Copilot assistant. You explain vulnerabilities, write policy remedies, and suggest CloudTrail log queries. Be precise."
    data = await chat_json(system_prompt, body.prompt, api_key=sarvam_key)
    
    if data and isinstance(data, dict):
        response_text = data.get("response") or data.get("content") or json.dumps(data)
    else:
        response_text = str(data) if data else "I am here to help you audit cloud security trails. You can query RAG context using `/search <query>`."
        
    return {"response": response_text}


@app.patch("/api/auth/profile")
async def update_profile(body: ProfileUpdateRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
    await neo4j_client.update_user_profile(user["id"], name)
    user["name"] = name
    return {"user": public_user(user)}


@app.post("/api/auth/change-password")
async def change_password(body: ChangePasswordRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    if not verify_password(body.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Incorrect current password.")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")
    
    password_hash = hash_password(body.new_password)
    await neo4j_client.update_user_password(user["id"], password_hash)
    return {"status": "ok"}


@app.patch("/api/auth/notifications")
async def update_notifications(body: NotificationsRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    await neo4j_client.update_notifications(user["id"], json.dumps(body.preferences))
    return {"status": "ok"}


@app.delete("/api/auth/account")
async def delete_account(body: DeleteAccountRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    if body.confirm != "DELETE":
        raise HTTPException(status_code=400, detail="Must type 'DELETE' to confirm deletion.")
    await neo4j_client.delete_user(user["id"])
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Vercel strips the /api prefix before forwarding to FastAPI.
# Register alias routes WITHOUT the /api prefix so both local dev and
# production work correctly without relying on middleware path-rewriting.
# ---------------------------------------------------------------------------
app.add_api_route("/auth/register",         register,              methods=["POST"])
app.add_api_route("/auth/login",            login,                 methods=["POST"])
app.add_api_route("/auth/me",               me,                    methods=["GET"])
app.add_api_route("/auth/logout",           logout,                methods=["POST"])
app.add_api_route("/auth/profile",          update_profile,        methods=["PATCH"])
app.add_api_route("/auth/change-password",  change_password,       methods=["POST"])
app.add_api_route("/auth/notifications",    update_notifications,  methods=["PATCH"])
app.add_api_route("/auth/account",          delete_account,        methods=["DELETE"])
app.add_api_route("/analyze/rerun",         rerun_analysis,        methods=["POST"])
app.add_api_route("/report/save",           save_report_endpoint,  methods=["POST"])
app.add_api_route("/history",               get_history,           methods=["GET"])
app.add_api_route("/report/{session_id}",   get_report,            methods=["GET"])
app.add_api_route("/wallet",                get_wallet,            methods=["GET"])
app.add_api_route("/wallet/upgrade",        upgrade_wallet,        methods=["POST"])
app.add_api_route("/wallet/transactions",   get_wallet_transactions, methods=["GET"])
app.add_api_route("/workflow/analyze",      trigger_workflow,      methods=["POST"])
app.add_api_route("/workflow/status/{session_id}", workflow_status, methods=["GET"])
app.add_api_route("/forensics/investigate", forensics_investigate, methods=["POST"])
app.add_api_route("/forensics/search",      forensics_search,      methods=["POST"])
app.add_api_route("/copilot/execute",       copilot_execute,       methods=["POST"])

