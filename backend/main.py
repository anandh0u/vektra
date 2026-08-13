import asyncio
import json
import logging
import os
import secrets
import sys
import types
import uuid
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field


def _ensure_backend_package_importable():
    try:
        import backend  # noqa: F401
        return
    except ModuleNotFoundError:
        package = types.ModuleType("backend")
        package.__path__ = [str(Path(__file__).resolve().parent)]
        sys.modules["backend"] = package


_ensure_backend_package_importable()

from backend.auth import JWT_EXPIRY_HOURS, create_token, get_current_user, hash_password, verify_password
from backend.agents.orchestrator import run_agents
from backend.agents.sarvam_client import SARVAM_MODEL, SARVAM_URL
from backend.graph.analyzer import build_and_analyze
from backend.simulation import simulate_policy_change
from backend.graph.neo4j_client import Neo4jClient
from backend.parser.iam_parser import parse_iam_policy
from backend.parser.k8s_parser import parse_k8s_rbac
from backend import workflow_steps
from backend.base44_client import (
    save_scan_history,
)
from backend import stellar_client
from backend.credits import check_and_deduct_credits, CREDIT_COSTS, DAILY_CREDITS
from backend.agents.rag_engine import global_rag_engine
from backend.agents.forensics_agents import run_forensic_pipeline


load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vektra.main")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    schedule_neo4j_verify()
    workflow_steps.neo4j = neo4j_client
    if await ensure_neo4j_ready(timeout=6.0):
        await neo4j_client.purge_stored_wallet_secrets()
    yield
    neo4j_client.close()


app = FastAPI(title="VEKTRA API", version="1.0.0", servers=[{"url": "/"}], lifespan=lifespan)
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


class SecurityMiddleware:
    """Apply basic request-size, security-header, and abuse protections."""
    def __init__(self, app, max_body_bytes: int = 2 * 1024 * 1024):
        self.app = app
        self.max_body_bytes = max_body_bytes
        self.requests = defaultdict(deque)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        try:
            content_length = int(headers.get(b"content-length", b"0"))
        except ValueError:
            content_length = self.max_body_bytes + 1
        if content_length > self.max_body_bytes:
            response = JSONResponse({"detail": "Request body is too large."}, status_code=413)
            return await response(scope, receive, send)

        path = scope.get("path", "")
        normalized_path = path if path.startswith("/api/") else f"/api{path}"
        if normalized_path.startswith("/api/internal/"):
            expected = os.getenv("INTERNAL_API_KEY", "")
            supplied = headers.get(b"x-internal-api-key", b"").decode("utf-8", "ignore")
            if not expected or not secrets.compare_digest(supplied, expected):
                response = JSONResponse({"detail": "Not found."}, status_code=404)
                return await response(scope, receive, send)
        limited_paths = {
            "/api/auth/login": 10,
            "/api/auth/register": 5,
            "/api/analyze": 10,
            "/api/simulate": 10,
            "/api/workflow/analyze": 10,
            "/api/chat": 30,
            "/api/assistant/message": 30,
            "/api/forensics/investigate": 5,
        }
        if normalized_path in limited_paths:
            client = scope.get("client") or ("unknown", 0)
            key = (client[0], normalized_path)
            now = time.monotonic()
            bucket = self.requests[key]
            while bucket and bucket[0] < now - 60:
                bucket.popleft()
            if len(bucket) >= limited_paths[normalized_path]:
                response = JSONResponse({"detail": "Too many requests. Try again shortly."}, status_code=429)
                return await response(scope, receive, send)
            bucket.append(now)

        async def secure_send(message):
            if message["type"] == "http.response.start":
                response_headers = list(message.get("headers", []))
                response_headers.extend([
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"referrer-policy", b"strict-origin-when-cross-origin"),
                    (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
                    (b"strict-transport-security", b"max-age=63072000; includeSubDomains; preload"),
                ])
                message["headers"] = response_headers
            await send(message)
        await self.app(scope, receive, secure_send)


def schedule_neo4j_verify() -> Optional[asyncio.Task]:
    global neo4j_verify_task
    if neo4j_client.connected or not neo4j_client.driver:
        return None
    if neo4j_verify_task and not neo4j_verify_task.done():
        return neo4j_verify_task
    neo4j_verify_task = asyncio.create_task(neo4j_client.verify_connection_async())
    return neo4j_verify_task

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
app.add_middleware(SecurityMiddleware)
cors_origins = [origin.strip() for origin in os.getenv(
    "CORS_ORIGINS", "https://vektra-six.vercel.app,http://localhost:5173"
).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    policy_text: str = Field(min_length=2, max_length=500_000)
    format: str
    session_id: Optional[str] = None


class SimulationRequest(BaseModel):
    current_policy: str = Field(min_length=2, max_length=500_000)
    proposed_policy: str = Field(min_length=2, max_length=500_000)
    format: str


class ReportSaveRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=100)
    report_data: Dict = Field(default_factory=dict)
    title: Optional[str] = Field(default=None, max_length=200)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=72)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=72)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8_000)
    policy_context: str = Field(default="", max_length=50_000)
    session_id: Optional[str] = None
    history: List[Dict[str, str]] = Field(default_factory=list, max_length=20)


class ForensicFile(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=500_000)


class ForensicInvestigateRequest(BaseModel):
    files: List[ForensicFile] = Field(min_length=1, max_length=20)
    case_id: Optional[str] = None


class CaseCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default="", max_length=10_000)
    priority: Optional[str] = Field(default="Medium", max_length=20)
    status: Optional[str] = Field(default="Open", max_length=30)
    due_date: Optional[str] = Field(default="", max_length=50)
    tags: Optional[List[str]] = Field(default_factory=list, max_length=20)
    team_members: Optional[List[str]] = Field(default_factory=list, max_length=20)


class CaseUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=10_000)
    priority: Optional[str] = Field(default=None, max_length=20)
    status: Optional[str] = Field(default=None, max_length=30)
    due_date: Optional[str] = Field(default=None, max_length=50)
    tags: Optional[List[str]] = Field(default=None, max_length=20)
    team_members: Optional[List[str]] = Field(default=None, max_length=20)


class CommentCreateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10_000)


class ActivityCreateRequest(BaseModel):
    action: str = Field(min_length=1, max_length=100)
    details: str = Field(min_length=1, max_length=10_000)


class EvidenceCreateRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=500_000)
    content_type: Optional[str] = Field(default="text/plain", max_length=100)
    device: Optional[str] = Field(default="Unknown", max_length=200)
    source: Optional[str] = Field(default="Upload", max_length=200)



class RAGSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1_000)


class AssistantMessageRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=8_000)


class ProfileUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=12, max_length=72)


class DeleteAccountRequest(BaseModel):
    confirm: str = Field(min_length=1, max_length=20)


class NotificationsRequest(BaseModel):
    preferences: dict = Field(default_factory=dict)


class UpgradeRequest(BaseModel):
    plan: str = Field(min_length=1, max_length=20)


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
    has_cookie = bool(request.cookies.get("vektra_session"))
    if not auth_header and not has_cookie:
        if required:
            raise HTTPException(status_code=401, detail="Authentication required.")
        return None

    claims = get_current_user(request)
    if not claims:
        raise HTTPException(status_code=401, detail="Session expired, please sign in.")

    if not await ensure_neo4j_ready(timeout=6.0):
        raise HTTPException(status_code=503, detail="Account storage is temporarily unavailable.")
    user = await neo4j_client.get_user_by_id(claims["user_id"])
    if user:
        if not secrets.compare_digest(str(claims.get("sv", "")), str(user.get("jwt_secret", ""))):
            raise HTTPException(status_code=401, detail="Session expired, please sign in.")
        return user
    if required:
        raise HTTPException(status_code=401, detail="User account not found.")
    return None


def set_session_cookie(response: Response, request: Request, token: str) -> None:
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",", 1)[0].strip()
    secure = request.url.scheme == "https" or forwarded_proto == "https"
    response.set_cookie(
        "vektra_session",
        token,
        max_age=JWT_EXPIRY_HOURS * 3600,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )


@app.get("/api/health")
async def health_check():
    neo4j_ok = neo4j_client.connected or await ensure_neo4j_ready(timeout=6.0)
    base44_ok = bool(
        os.getenv("BASE44_API_KEY")
        and os.getenv("BASE44_APP_ID")
        and os.getenv("BASE44_DATA_EXPORT_ENABLED", "false").lower() == "true"
    )
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
async def register(body: RegisterRequest, background_tasks: BackgroundTasks, response: Response, http_request: Request):
    name = body.name.strip()
    email = body.email.strip().lower()
    password = body.password

    if not name:
        raise HTTPException(status_code=400, detail="Name is required.")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(password) < 12:
        raise HTTPException(status_code=400, detail="Password must be at least 12 characters.")

    if not await ensure_neo4j_ready(timeout=6.0):
        raise HTTPException(status_code=503, detail="Account storage is temporarily unavailable.")
    existing = await neo4j_client.get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered.")

    # Generate Stellar key pair locally (instant)
    try:
        from stellar_sdk import Keypair
        keypair = Keypair.random()
        public_key = keypair.public_key
        secret_key = keypair.secret
    except Exception:
        public_key = "G" + str(uuid.uuid4()).replace("-", "")[:55]
        secret_key = "S" + str(uuid.uuid4()).replace("-", "")[:55]

    try:
        created = await neo4j_client.create_user(
            {
                "name": name,
                "email": email,
                "password_hash": hash_password(password),
                "stellar_public_key": public_key,
                "credits_balance": DAILY_CREDITS.get("free", 5),
                "tier": "free",
            }
        )
    except Exception as exc:
        logger.exception("User registration failed.")
        raise HTTPException(status_code=503, detail="User storage is unavailable.") from exc

    # Set up wallet trustlines and assets asynchronously in background
    async def setup_stellar_bg(pub_key: str, sec_key: str):
        if pub_key.startswith("G") and len(pub_key) > 50 and not sec_key.startswith("S" + pub_key[1:5]):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    res = await client.get(f"https://friendbot.stellar.org/?addr={pub_key}")
                    res.raise_for_status()
                await stellar_client.setup_user_trustlines(pub_key, sec_key)
                await stellar_client.mint_tier_nft(pub_key, "free")
                await stellar_client.issue_credits(pub_key, DAILY_CREDITS.get("free", 5))
            except Exception as e:
                logger.error("Failed to setup Stellar wallet in background for %s: %s", pub_key, e)

    background_tasks.add_task(setup_stellar_bg, public_key, secret_key)

    token = create_token(created["id"], created["email"], created.get("tier", "free"), created["jwt_secret"])
    set_session_cookie(response, http_request, token)
    return {"user": public_user(created)}


@app.post("/api/auth/login")
async def login(body: LoginRequest, background_tasks: BackgroundTasks, response: Response, http_request: Request):
    email = body.email.strip().lower()
    if not await ensure_neo4j_ready(timeout=6.0):
        raise HTTPException(status_code=503, detail="Account storage is temporarily unavailable.")
    user = await neo4j_client.get_user_by_email(email)
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    # Sync wallet balance from Stellar asynchronously in background
    async def sync_balance_bg(u_id: str, pub_key: str):
        try:
            balance_data = await stellar_client.get_wallet_balance(pub_key)
            credits_val = balance_data.get("credits", 0)
            nft_tier = balance_data.get("nft_tier", "free")
            
            await neo4j_client.update_credits(u_id, credits_val)
            await neo4j_client.update_user_tier(u_id, nft_tier)
        except Exception:
            logger.warning("Stellar balance sync failed in background.")

    if user.get("stellar_public_key") and not user["stellar_public_key"].startswith("G"):
        background_tasks.add_task(sync_balance_bg, user["id"], user["stellar_public_key"])

    token = create_token(user["id"], user["email"], user.get("tier", "free"), user["jwt_secret"])
    set_session_cookie(response, http_request, token)
    return {"user": public_user(user)}


@app.get("/api/auth/me")
async def me(http_request: Request, background_tasks: BackgroundTasks):
    user = await resolve_request_user(http_request, required=True)
    
    # Sync wallet balance from Stellar in background
    async def sync_balance_bg(u_id: str, pub_key: str):
        try:
            balance_data = await stellar_client.get_wallet_balance(pub_key)
            credits_val = balance_data.get("credits", 0)
            nft_tier = balance_data.get("nft_tier", "free")
            
            await neo4j_client.update_credits(u_id, credits_val)
            await neo4j_client.update_user_tier(u_id, nft_tier)
        except Exception:
            pass

    if user.get("stellar_public_key") and not user["stellar_public_key"].startswith("G"):
        background_tasks.add_task(sync_balance_bg, user["id"], user["stellar_public_key"])

    return {"user": public_user(user)}


@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("vektra_session", path="/", httponly=True, samesite="lax")
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

    neo4j_ready = await ensure_neo4j_ready(timeout=6.0)
    if neo4j_ready:
        neo4j_client.clear_session(session_id)
        neo4j_client.write_rules(analysis_result.rules, session_id)
        neo4j_client.write_edges(analysis_result.edges, session_id)
        critical_paths = neo4j_client.find_critical_paths(session_id)
    else:
        critical_paths = []

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
    if neo4j_ready:
        try:
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
        except Exception as exc:
            logger.warning("Analysis completed but Neo4j session persistence failed: %s", exc)

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


@app.post("/api/simulate")
async def simulate_change(body: SimulationRequest, http_request: Request):
    policy_format = body.format.lower()
    if policy_format not in {"iam", "k8s"}:
        raise HTTPException(status_code=400, detail="Invalid format. Supported formats are 'iam' and 'k8s'.")
    try:
        result = simulate_policy_change(body.current_policy, body.proposed_policy, policy_format)
    except Exception as exc:
        logger.info("Policy simulation input rejected: %s", exc)
        raise HTTPException(status_code=400, detail=f"Unable to simulate policy change: {exc}") from exc

    user = await resolve_request_user(http_request, required=False)
    simulation_id = str(uuid.uuid4())
    result["simulation_id"] = simulation_id
    result["persisted"] = False
    if user and await ensure_neo4j_ready(timeout=3.0):
        result["persisted"] = await neo4j_client.save_simulation(
            simulation_id, user["id"], policy_format, result
        )
    return result


@app.post("/api/analyze/rerun")
async def rerun_analysis(
    body: RerunRequest,
    http_request: Request,
    x_sarvam_api_key: Optional[str] = Header(None),
):
    user = await resolve_request_user(http_request, required=True)
    if not await neo4j_client.session_belongs_to_user(body.session_id, user["id"]):
        raise HTTPException(status_code=404, detail="Analysis session not found.")
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
    http_request: Request,
    x_sarvam_api_key: Optional[str] = Header(None),
):
    user = await resolve_request_user(http_request, required=True)
    deduct_res = await check_and_deduct_credits(user, "chat_message", neo4j_client)
    if not deduct_res["allowed"]:
        raise HTTPException(status_code=429, detail=deduct_res.get("error", "Insufficient credits."))
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
            timeout = httpx.Timeout(45.0, connect=10.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
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
                                delta_content = choices[0].get("delta", {})
                                delta = delta_content.get("content") or delta_content.get("reasoning_content")
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
async def trigger_workflow(body: dict, background_tasks: BackgroundTasks, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    if not await ensure_neo4j_ready(timeout=6.0):
        raise HTTPException(status_code=503, detail="Workflow storage is temporarily unavailable. Use direct analysis or retry shortly.")
    policy_text = body.get("policy_text", "")
    if not isinstance(policy_text, str) or not 2 <= len(policy_text) <= 500_000:
        raise HTTPException(status_code=422, detail="Policy text must be between 2 and 500000 characters.")
    if body.get("format") not in {"iam", "k8s"}:
        raise HTTPException(status_code=422, detail="Invalid policy format.")
    session_id = body.get("session_id", str(uuid.uuid4()))
    body["user_id"] = user["id"]

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
            "owner_id": user["id"],
        },
        0,
    )

    async def run_workflow_bg():
        try:
            # Step 1: Parse policy
            await workflow_steps.step_parse(body)

            # Step 2: Build graph (depends on step 1)
            await workflow_steps.step_build_graph({"session_id": session_id})

            # Steps 3A + 3B + 4: Run SIMULTANEOUSLY — Neo4j save, Base44 history, and Vulnerability Analysts
            await asyncio.gather(
                workflow_steps.step_save_graph({"session_id": session_id}),
                workflow_steps.step_save_history({"session_id": session_id}),
                workflow_steps.step_run_analysts({"session_id": session_id}),
                return_exceptions=True,  # don't let any step failure block others
            )

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
            await neo4j_client.save_workflow_state(
                session_id,
                "workflow-error",
                "failed",
                {"error": str(e), "failed_at": datetime.now().isoformat()},
                100,
            )

    background_tasks.add_task(run_workflow_bg)

    return {
        "status": "triggered",
        "session_id": session_id
    }


@app.get("/api/workflow/status/{session_id}")
async def workflow_status(session_id: str, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    state = await neo4j_client.get_workflow_state(session_id)
    trigger = state.get("workflow-trigger", {}).get("output", {})
    if trigger.get("owner_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Workflow not found.")

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
async def save_report_endpoint(body: ReportSaveRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    session_id = body.session_id
    if not await neo4j_client.session_belongs_to_user(session_id, user["id"]):
        raise HTTPException(status_code=404, detail="Analysis session not found.")
    report_data = {**body.report_data, "owner_id": user["id"]}
    title = body.title or f"Scan {session_id[:8]}"
    saved = await neo4j_client.save_user_report(session_id, user["id"], title, report_data)
    if not saved:
        raise HTTPException(status_code=503, detail="Report storage is temporarily unavailable.")
    return {"status": "saved"}


@app.get("/api/history")
async def get_history(http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    neo4j_history = await neo4j_client.get_user_scan_history(user["id"], limit=50)
    return {"history": neo4j_history}


@app.get("/api/report/{session_id}")
async def get_report(session_id: str, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    report = await neo4j_client.get_user_report(session_id, user["id"])
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
    await resolve_request_user(http_request, required=True)
    raise HTTPException(
        status_code=503,
        detail="Plan upgrades are temporarily unavailable until verified payment processing is configured.",
    )


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
    rag_namespace = f"user:{user['id']}"
    global_rag_engine.clear(rag_namespace)
    for f in body.files:
        global_rag_engine.add_document(f.content, f.filename, rag_namespace)
    
    sarvam_key = os.getenv("SARVAM_API_KEY")
    evidence_data = [{"filename": f.filename, "content": f.content} for f in body.files]
    state = await run_forensic_pipeline(evidence_data, api_key=sarvam_key)
    
    await ensure_neo4j_ready()
    entities = state.evidence_output.get("extracted_entities", {})
    await neo4j_client.save_forensic_nodes(state.id, entities)
    
    if body.case_id:
        await require_case_access(body.case_id, user)
        await neo4j_client.link_scan_to_case(body.case_id, state.id)
        await neo4j_client.add_case_activity(
            body.case_id, user["email"], "scan_attached", f"Autonomous forensic scan run (Session ID: {state.id}) and attached to case."
        )
    
    return {
        "session_id": state.id,
        "planner": state.planner_output,
        "evidence": state.evidence_output,
        "timeline": state.timeline_output,
        "risk": state.risk_output,
        "threat_intel": getattr(state, "threat_intel_output", {}),
        "ioc": getattr(state, "ioc_output", {}),
        "mitre": getattr(state, "mitre_output", {}),
        "containment": getattr(state, "containment_output", {}),
        "remediation": getattr(state, "remediation_output", {}),
        "executive_summary": getattr(state, "executive_summary_output", {}),
        "report": state.report_output
    }


@app.post("/api/forensics/search")
async def forensics_search(body: RAGSearchRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    results = global_rag_engine.search(body.query, top_k=3, namespace=f"user:{user['id']}")
    return {"results": results}


@app.post("/api/assistant/message")
async def assistant_message(body: AssistantMessageRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    prompt_clean = body.prompt.strip().lower()
    
    if prompt_clean.startswith("/search"):
        query = body.prompt[7:].strip()
        results = global_rag_engine.search(query, top_k=2, namespace=f"user:{user['id']}")
        if not results:
            return {"response": f"RAG returned no matches for: {query}"}
        resp = "Here are the top matches from our RAG semantic store:\n\n"
        for idx, res in enumerate(results):
            resp += f"**[{idx+1}] Source: {res['source']} (Confidence: {res['confidence_score']}%):**\n"
            resp += f"> {res['text']}\n\n"
        return {"response": resp}
        
    elif prompt_clean.startswith("/timeline"):
        results = global_rag_engine.search("event timeline timestamp", top_k=5, namespace=f"user:{user['id']}")
        if not results:
            return {"response": "No indexed timeline evidence is available yet."}
        return {"response": "\n\n".join(f"**{r['source']}**\n{r['text']}" for r in results)}
        
    elif prompt_clean.startswith("/remediate"):
        return {"response": "Describe the exact finding or policy statement to remediate. I will not invent a fix without evidence context."}
        
    elif prompt_clean.startswith("/report"):
        results = global_rag_engine.search("executive summary risk recommendation", top_k=5, namespace=f"user:{user['id']}")
        if not results:
            return {"response": "No indexed investigation evidence is available for a report."}
        return {"response": "\n\n".join(f"**{r['source']}**\n{r['text']}" for r in results)}
        
    sarvam_key = os.getenv("SARVAM_API_KEY")
    system_prompt = "You are the VEKTRA Security Assistant. Explain vulnerabilities, write least-privilege remedies, and suggest CloudTrail queries. Be precise, transparent about uncertainty, and never claim an action was performed when you only recommended it."
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
async def change_password(body: ChangePasswordRequest, http_request: Request, response: Response):
    user = await resolve_request_user(http_request, required=True)
    if not verify_password(body.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Incorrect current password.")
    if len(body.new_password) < 12:
        raise HTTPException(status_code=400, detail="New password must be at least 12 characters.")
    
    password_hash = hash_password(body.new_password)
    new_session_version = secrets.token_urlsafe(32)
    await neo4j_client.update_user_password(user["id"], password_hash, new_session_version)
    token = create_token(user["id"], user["email"], user.get("tier", "free"), new_session_version)
    set_session_cookie(response, http_request, token)
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


import hashlib


async def require_case_access(case_id: str, user: dict, *, owner_only: bool = False) -> dict:
    case = await neo4j_client.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    is_owner = case.get("owner_email") == user.get("email")
    is_member = user.get("email") in (case.get("team_members") or [])
    if not is_owner and (owner_only or not is_member):
        # Do not reveal that another tenant's case exists.
        raise HTTPException(status_code=404, detail="Case not found.")
    return case

@app.post("/api/cases")
async def create_case_endpoint(body: CaseCreateRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    await ensure_neo4j_ready()
    case_data = {
        "name": body.name,
        "description": body.description,
        "priority": body.priority,
        "status": body.status,
        "due_date": body.due_date,
        "tags": body.tags,
        "team_members": body.team_members,
        "owner_email": user["email"]
    }
    created = await neo4j_client.create_case(case_data)
    await neo4j_client.add_case_activity(
        created["id"], user["email"], "case_created", f"Case '{body.name}' was initialized."
    )
    return created

@app.get("/api/cases")
async def list_cases_endpoint(http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    await ensure_neo4j_ready()
    return await neo4j_client.list_cases(owner_email=user["email"])

@app.get("/api/cases/{case_id}")
async def get_case_endpoint(case_id: str, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    await ensure_neo4j_ready()
    case = await require_case_access(case_id, user)
    return case

@app.put("/api/cases/{case_id}")
async def update_case_endpoint(case_id: str, body: CaseUpdateRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    await ensure_neo4j_ready()
    await require_case_access(case_id, user, owner_only=True)
    updated = await neo4j_client.update_case(case_id, body.dict(exclude_none=True))
    await neo4j_client.add_case_activity(
        case_id, user["email"], "case_updated", f"Case properties updated: {body.dict(exclude_none=True)}"
    )
    return updated

@app.delete("/api/cases/{case_id}")
async def delete_case_endpoint(case_id: str, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    await ensure_neo4j_ready()
    await require_case_access(case_id, user, owner_only=True)
    success = await neo4j_client.delete_case(case_id)
    return {"status": "ok" if success else "failed"}

@app.post("/api/cases/{case_id}/evidence")
async def add_case_evidence_endpoint(case_id: str, body: EvidenceCreateRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    await ensure_neo4j_ready()
    await require_case_access(case_id, user)
    
    # Calculate checksums
    content_bytes = body.content.encode("utf-8")
    sha256_hash = hashlib.sha256(content_bytes).hexdigest()
    sha1_hash = hashlib.sha1(content_bytes).hexdigest()
    md5_hash = hashlib.md5(content_bytes).hexdigest()
    
    # Anchor to Stellar testnet blockchain
    tx_hash = await stellar_client.anchor_evidence_hash(body.filename, sha256_hash)
    
    evidence_data = {
        "filename": body.filename,
        "content_type": body.content_type,
        "sha256": sha256_hash,
        "sha1": sha1_hash,
        "md5": md5_hash,
        "investigator": user["email"],
        "device": body.device,
        "source": body.source,
        "size_bytes": len(content_bytes),
        "stellar_tx_hash": tx_hash
    }
    
    evidence_node = await neo4j_client.add_case_evidence(case_id, evidence_data)
    anchor_status = "anchored to Stellar" if tx_hash else "stored; Stellar anchoring unavailable"
    await neo4j_client.add_case_activity(
        case_id, user["email"], "evidence_uploaded", f"Evidence file '{body.filename}' uploaded and {anchor_status}."
    )
    
    # Add to global RAG engine automatically
    global_rag_engine.add_document(body.content, body.filename, namespace=f"user:{user['id']}")
    
    return evidence_node

@app.get("/api/cases/{case_id}/evidence")
async def get_case_evidence_endpoint(case_id: str, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    await ensure_neo4j_ready()
    await require_case_access(case_id, user)
    return await neo4j_client.get_case_evidence(case_id)

@app.post("/api/cases/{case_id}/comments")
async def add_case_comment_endpoint(case_id: str, body: CommentCreateRequest, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    await ensure_neo4j_ready()
    await require_case_access(case_id, user)
    comment = await neo4j_client.add_case_comment(case_id, user["name"], body.text)
    await neo4j_client.add_case_activity(
        case_id, user["email"], "comment_added", f"Investigator comment added to discussion thread."
    )
    return comment

@app.get("/api/cases/{case_id}/comments")
async def get_case_comments_endpoint(case_id: str, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    await ensure_neo4j_ready()
    await require_case_access(case_id, user)
    return await neo4j_client.get_case_comments(case_id)

@app.get("/api/cases/{case_id}/activity")
async def get_case_activities_endpoint(case_id: str, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    await ensure_neo4j_ready()
    await require_case_access(case_id, user)
    return await neo4j_client.get_case_activities(case_id)

@app.get("/api/search/global")
async def global_search_endpoint(q: str, http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    await ensure_neo4j_ready()
    cases = await neo4j_client.list_cases(owner_email=user["email"])
    
    # Simple fuzzy search filter on cases
    query = q[:500].lower().strip()
    matching_cases = [
        c for c in cases
        if query in c.get("name", "").lower() or query in c.get("description", "").lower()
    ]
    return {
        "cases": matching_cases,
        "artifacts": [],
        "suggestions": []
    }

@app.get("/api/analytics/dashboard")
async def analytics_dashboard_endpoint(http_request: Request):
    user = await resolve_request_user(http_request, required=True)
    await ensure_neo4j_ready()
    cases = await neo4j_client.list_cases(owner_email=user["email"])
    
    # Calculate simple MTTR/MTTD values
    total_cases = len(cases)
    resolved_cases = len([c for c in cases if c.get("status") in {"Resolved", "Closed"}])
    investigating_cases = len([c for c in cases if c.get("status") == "Investigating"])
    critical_cases = len([c for c in cases if c.get("priority") == "Critical"])
    
    return {
        "mttd_hours": None,
        "mttr_hours": None,
        "total_cases": total_cases,
        "resolved_cases": resolved_cases,
        "investigating_cases": investigating_cases,
        "critical_cases": critical_cases,
        "threat_trends": []
    }


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
app.add_api_route("/assistant/message",     assistant_message,     methods=["POST"])
# Backward-compatible aliases for older web/mobile clients.
app.add_api_route("/api/copilot/execute",  assistant_message,     methods=["POST"], include_in_schema=False)
app.add_api_route("/copilot/execute",      assistant_message,     methods=["POST"], include_in_schema=False)

# DFIR Case and Evidence Route Mappings
app.add_api_route("/cases",                 list_cases_endpoint,   methods=["GET"])
app.add_api_route("/cases",                 create_case_endpoint,  methods=["POST"])
app.add_api_route("/cases/{case_id}",       get_case_endpoint,     methods=["GET"])
app.add_api_route("/cases/{case_id}",       update_case_endpoint,  methods=["PUT"])
app.add_api_route("/cases/{case_id}",       delete_case_endpoint,  methods=["DELETE"])
app.add_api_route("/cases/{case_id}/evidence", get_case_evidence_endpoint, methods=["GET"])
app.add_api_route("/cases/{case_id}/evidence", add_case_evidence_endpoint, methods=["POST"])
app.add_api_route("/cases/{case_id}/comments", get_case_comments_endpoint, methods=["GET"])
app.add_api_route("/cases/{case_id}/comments", add_case_comment_endpoint, methods=["POST"])
app.add_api_route("/cases/{case_id}/activity", get_case_activities_endpoint, methods=["GET"])
app.add_api_route("/search/global",         global_search_endpoint, methods=["GET"])
app.add_api_route("/analytics/dashboard",   analytics_dashboard_endpoint, methods=["GET"])
