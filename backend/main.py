import asyncio
import json
import logging
import os
import uuid
from datetime import date
from typing import Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from backend.auth import create_token, get_current_user, hash_password, verify_password
from backend.agents.orchestrator import run_agents
from backend.agents.sarvam_client import SARVAM_MODEL, SARVAM_URL
from backend.graph.analyzer import build_and_analyze
from backend.graph.neo4j_client import Neo4jClient
from backend.parser.iam_parser import parse_iam_policy
from backend.parser.k8s_parser import parse_k8s_rbac
from backend.base44_client import (
    save_scan_history,
    save_report,
    get_scan_history,
    get_saved_report
)
from backend import stellar_client
from backend.credits import check_and_deduct_credits, CREDIT_COSTS, DAILY_CREDITS


load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vektra.main")

app = FastAPI(title="VEKTRA API", version="1.0.0")
neo4j_client = Neo4jClient()

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
    base44_ok = bool(
        (os.getenv("BASE44_API_KEY") or "1ec5cf39c2ff457c9686d35b1c5650d0") and
        (os.getenv("BASE44_APP_ID") or "6a494c246e43fac149974886")
    )
    return {
        "status": "ok",
        "neo4j": neo4j_client.connected,
        "sarvam": bool(os.getenv("SARVAM_API_KEY") or "sk_ofdpfh1o_zdhNv5LJscgGaqW2hvP16uPX"),
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

    existing = await neo4j_client.get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered.")

    # Create Stellar wallet and setup trustlines/tokens
    try:
        wallet = await stellar_client.create_user_wallet()
        public_key = wallet["public_key"]
        secret_key = wallet["secret_key"]
        
        await stellar_client.setup_user_trustlines(public_key, secret_key)
        await stellar_client.mint_tier_nft(public_key, "free")
        await stellar_client.issue_credits(public_key, 5)
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
                "credits_balance": 5,
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
