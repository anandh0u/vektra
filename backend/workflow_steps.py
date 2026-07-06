"""
workflow_steps.py — Internal step functions for the VEKTRA policy-analysis-pipeline.

Each step:
  - Accepts a dict body (session_id + any step-specific inputs)
  - Reads prior step outputs from Neo4j via get_step_output()
  - Saves its own output via save_workflow_state()
  - Returns { step, status, duration_ms, output }
  - Never crashes silently — raises so main.py can catch and record failure

Steps 3A/3B and 4 (analyst fan-out) and 5 (fix fan-out) run in parallel.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict

from backend.agents.conflict_analyst import analyze as run_vulnerability_analyst
from backend.agents.fix_advisor import advise as run_fix_engineer
from backend.agents.risk_scorer import score as run_risk_scorer
from backend.agents.sarvam_client import get_api_key
from backend.graph.analyzer import build_and_analyze
from backend.graph.models import Rule, Edge, Vulnerability
from backend.parser.iam_parser import parse_iam_policy
from backend.parser.k8s_parser import parse_k8s_rbac

logger = logging.getLogger("vektra.workflow_steps")

# Shared Neo4jClient — set by main.py after startup so we use the same instance
neo4j: "Neo4jClient | None" = None  # type: ignore[name-defined]  # noqa: F821


def _now_ms(start: datetime) -> int:
    return int((datetime.now() - start).total_seconds() * 1000)


# ── STEP 1 ─────────────────────────────────────────────────────────────────────

async def step_parse(body: Dict) -> Dict:
    step_name = "step-1-parse"
    session_id = body.get("session_id")
    start = datetime.now()

    try:
        policy_text = body.get("policy_text", "")
        fmt = body.get("format", "iam")

        if fmt == "iam":
            rules = parse_iam_policy(policy_text)
        else:
            rules = parse_k8s_rbac(policy_text)

        output = {
            "rules": [r.dict() for r in rules],
            "rules_count": len(rules),
            "format": fmt,
            "session_id": session_id,
        }

        duration = _now_ms(start)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "complete", output, duration)

        return {
            "step": step_name,
            "status": "complete",
            "duration_ms": duration,
            "output": output,
        }

    except Exception as e:
        duration = _now_ms(start)
        logger.exception("%s failed", step_name)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "failed", {"error": str(e)}, duration)
        raise


# ── STEP 2 ─────────────────────────────────────────────────────────────────────

async def step_build_graph(body: Dict) -> Dict:
    step_name = "step-2-graph"
    session_id = body.get("session_id")
    start = datetime.now()

    try:
        step1 = await neo4j.get_step_output(session_id, "step-1-parse") if neo4j else {}
        raw_rules = step1.get("rules", [])
        fmt = step1.get("format", "iam")

        rule_objects = [Rule(**r) for r in raw_rules]

        # build_and_analyze returns an AnalysisResult
        analysis = build_and_analyze(rule_objects, format=fmt)

        output = {
            "nodes": [r.dict() for r in analysis.rules],
            "edges": [e.dict() for e in analysis.edges],
            "vulnerabilities": [v.dict() for v in analysis.conflicts],
            "stats": {
                "total_rules": len(analysis.rules),
                "vulnerabilities_found": len(analysis.conflicts),
                "critical_count": sum(1 for v in analysis.conflicts if v.severity == "CRITICAL"),
                "warning_count": sum(1 for v in analysis.conflicts if v.severity == "WARNING"),
            },
            "most_dangerous_rule": analysis.most_dangerous_rule,
        }

        duration = _now_ms(start)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "complete", output, duration)

        return {
            "step": step_name,
            "status": "complete",
            "duration_ms": duration,
            "output": output,
        }

    except Exception as e:
        duration = _now_ms(start)
        logger.exception("%s failed", step_name)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "failed", {"error": str(e)}, duration)
        raise


# ── STEP 3A: Save to Neo4j ──────────────────────────────────────────────────────

async def step_save_graph(body: Dict) -> Dict:
    step_name = "step-3-neo4j"
    session_id = body.get("session_id")
    start = datetime.now()

    try:
        step2 = await neo4j.get_step_output(session_id, "step-2-graph") if neo4j else {}

        rule_objects = [Rule(**r) for r in step2.get("nodes", [])]
        edge_objects = [Edge(**e) for e in step2.get("edges", [])]

        if neo4j:
            # clear_session, write_rules, write_edges, find_critical_paths are sync methods
            # run them via asyncio.to_thread to avoid blocking the event loop
            await asyncio.to_thread(neo4j.clear_session, session_id)
            await asyncio.to_thread(neo4j.write_rules, rule_objects, session_id)
            await asyncio.to_thread(neo4j.write_edges, edge_objects, session_id)
            critical_paths = await asyncio.to_thread(neo4j.find_critical_paths, session_id)
        else:
            critical_paths = []

        output = {
            "neo4j_status": "saved",
            "rules_written": len(rule_objects),
            "edges_written": len(edge_objects),
            "critical_paths": critical_paths,
        }

        duration = _now_ms(start)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "complete", output, duration)

        return {
            "step": step_name,
            "status": "complete",
            "duration_ms": duration,
            "output": output,
        }

    except Exception as e:
        duration = _now_ms(start)
        logger.exception("%s failed", step_name)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "failed", {"error": str(e)}, duration)
        raise


# ── STEP 3B: Save to Base44 ─────────────────────────────────────────────────────

async def step_save_history(body: Dict) -> Dict:
    step_name = "step-3-base44"
    session_id = body.get("session_id")
    start = datetime.now()

    try:
        step1 = await neo4j.get_step_output(session_id, "step-1-parse") if neo4j else {}
        step2 = await neo4j.get_step_output(session_id, "step-2-graph") if neo4j else {}

        fmt = step1.get("format", "iam")
        stats = step2.get("stats", {})

        # Import Base44 save function — wrapped in try so Base44 outage never fails the workflow
        try:
            from backend.base44_client import save_scan_history
            await save_scan_history(session_id, fmt, stats, "")
            base44_status = "saved"
        except Exception as b44_err:
            logger.warning("Base44 save_scan_history failed: %s", b44_err)
            base44_status = "degraded"

        output = {
            "base44_status": base44_status,
            "service": "base44",
            "session_id": session_id,
        }

        duration = _now_ms(start)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "complete", output, duration)

        return {
            "step": step_name,
            "status": "complete",
            "duration_ms": duration,
            "output": output,
        }

    except Exception as e:
        duration = _now_ms(start)
        logger.exception("%s failed", step_name)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "failed", {"error": str(e)}, duration)
        raise


# ── STEP 4: Run Analysts (parallel fan-out) ─────────────────────────────────────

async def step_run_analysts(body: Dict) -> Dict:
    step_name = "step-4-agents"
    session_id = body.get("session_id")
    start = datetime.now()

    try:
        step2 = await neo4j.get_step_output(session_id, "step-2-graph") if neo4j else {}
        vulns = step2.get("vulnerabilities", [])
        api_key = get_api_key()

        # Fan-out: all analyst calls run SIMULTANEOUSLY
        async def analyze_one(vuln_dict):
            try:
                result = await run_vulnerability_analyst(vuln_dict, api_key=api_key)
                return {**vuln_dict, "agent1": result}
            except Exception as e:
                logger.warning("Analyst failed for vuln %s: %s", vuln_dict.get("id"), e)
                return {**vuln_dict, "agent1": None}

        results = await asyncio.gather(*[analyze_one(v) for v in vulns])
        enriched = list(results)

        output = {
            "enriched_vulnerabilities": enriched,
            "analysts_run": len(vulns),
            "analysts_succeeded": sum(1 for v in enriched if v.get("agent1") is not None),
        }

        duration = _now_ms(start)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "complete", output, duration)

        return {
            "step": step_name,
            "status": "complete",
            "duration_ms": duration,
            "output": output,
        }

    except Exception as e:
        duration = _now_ms(start)
        logger.exception("%s failed", step_name)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "failed", {"error": str(e)}, duration)
        raise


# ── STEP 5: Run Fixes (parallel, CRITICAL + WARNING only) ──────────────────────

async def step_run_fixes(body: Dict) -> Dict:
    step_name = "step-5-fixes"
    session_id = body.get("session_id")
    policy_text = body.get("policy_text", "")
    start = datetime.now()

    try:
        step4 = await neo4j.get_step_output(session_id, "step-4-agents") if neo4j else {}
        step1 = await neo4j.get_step_output(session_id, "step-1-parse") if neo4j else {}

        enriched = step4.get("enriched_vulnerabilities", [])
        fmt = step1.get("format", "iam")
        api_key = get_api_key()

        # Only CRITICAL + WARNING get fixes; run all fix calls in parallel
        fix_targets = [v for v in enriched if v.get("severity") in ("CRITICAL", "WARNING")]

        async def fix_one(vuln_dict):
            try:
                result = await run_fix_engineer(vuln_dict, policy_text, fmt, api_key=api_key)
                return vuln_dict["id"], result
            except Exception as e:
                logger.warning("Fix engineer failed for vuln %s: %s", vuln_dict.get("id"), e)
                return vuln_dict["id"], None

        fix_results = await asyncio.gather(*[fix_one(v) for v in fix_targets])
        fix_map = {vid: fix for vid, fix in fix_results}

        # Merge fixes back into full enriched list
        for v in enriched:
            v["agent2"] = fix_map.get(v["id"])

        output = {
            "enriched_vulnerabilities": enriched,
            "fixes_generated": sum(1 for fix in fix_map.values() if fix is not None),
        }

        duration = _now_ms(start)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "complete", output, duration)

        return {
            "step": step_name,
            "status": "complete",
            "duration_ms": duration,
            "output": output,
        }

    except Exception as e:
        duration = _now_ms(start)
        logger.exception("%s failed", step_name)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "failed", {"error": str(e)}, duration)
        raise


# ── STEP 6: Risk Scorer ─────────────────────────────────────────────────────────

async def step_run_scorer(body: Dict) -> Dict:
    step_name = "step-6-score"
    session_id = body.get("session_id")
    start = datetime.now()

    try:
        step5 = await neo4j.get_step_output(session_id, "step-5-fixes") if neo4j else {}
        enriched = step5.get("enriched_vulnerabilities", [])
        api_key = get_api_key()

        risk = await run_risk_scorer(enriched, api_key=api_key)

        output = risk or {
            "risk_score": 0,
            "risk_label": "LOW",
            "executive_summary": "Risk scorer did not return a result.",
            "top_3_priorities": [],
            "compliance_notes": "",
        }

        duration = _now_ms(start)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "complete", output, duration)

        return {
            "step": step_name,
            "status": "complete",
            "duration_ms": duration,
            "output": output,
        }

    except Exception as e:
        duration = _now_ms(start)
        logger.exception("%s failed", step_name)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "failed", {"error": str(e)}, duration)
        raise


# ── STEP 7: Finalize ────────────────────────────────────────────────────────────

async def step_finalize(body: Dict) -> Dict:
    step_name = "step-7-finalize"
    session_id = body.get("session_id")
    user_id = body.get("user_id")
    start = datetime.now()

    try:
        step2 = await neo4j.get_step_output(session_id, "step-2-graph") if neo4j else {}
        step3n = await neo4j.get_step_output(session_id, "step-3-neo4j") if neo4j else {}
        step5 = await neo4j.get_step_output(session_id, "step-5-fixes") if neo4j else {}
        step6 = await neo4j.get_step_output(session_id, "step-6-score") if neo4j else {}
        step1 = await neo4j.get_step_output(session_id, "step-1-parse") if neo4j else {}

        enriched = step5.get("enriched_vulnerabilities", [])
        risk = step6 or {}
        fmt = step1.get("format", "iam")

        # Deduct credits if user is logged in
        credits_deducted = 0
        credits_remaining = None
        if user_id and neo4j:
            try:
                user = await neo4j.get_user_by_id(user_id)
                if user:
                    current_credits = user.get("credits_balance", 0)
                    credits_deducted = 1
                    credits_remaining = max(0, current_credits - credits_deducted)
                    await neo4j.update_credits(user_id, credits_remaining)
            except Exception as credit_err:
                logger.warning("Credit deduction failed: %s", credit_err)

        # Upsert scan session
        nodes = step2.get("nodes", [])
        stats = {
            **step2.get("stats", {}),
            "risk_score": risk.get("risk_score", 0),
            "risk_label": risk.get("risk_label", "LOW"),
            "executive_summary": risk.get("executive_summary", ""),
            "top_3_priorities": risk.get("top_3_priorities", []),
            "compliance_notes": risk.get("compliance_notes", ""),
            "most_dangerous_rule": (
                max(nodes, key=lambda n: n.get("centrality_score", 0))["id"]
                if nodes else None
            ),
        }

        if neo4j:
            await neo4j.upsert_scan_session(session_id, fmt, stats, "", user_id=user_id)
            if user_id:
                await neo4j.link_session_to_user(user_id, session_id)
                await neo4j.increment_scan_count(user_id)

        output = {
            "session_id": session_id,
            "nodes": nodes,
            "edges": step2.get("edges", []),
            "vulnerabilities": enriched,
            "critical_paths": step3n.get("critical_paths", []),
            "stats": stats,
            "credits_deducted": credits_deducted,
            "credits_remaining": credits_remaining,
            "workflow_complete": True,
        }

        duration = _now_ms(start)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "complete", output, duration)

        return {
            "step": step_name,
            "status": "complete",
            "duration_ms": duration,
            "output": output,
        }

    except Exception as e:
        duration = _now_ms(start)
        logger.exception("%s failed", step_name)
        if neo4j:
            await neo4j.save_workflow_state(session_id, step_name, "failed", {"error": str(e)}, duration)
        raise
