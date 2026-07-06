import asyncio
import logging
import os
from datetime import datetime
from typing import Dict, List

from backend.agents.conflict_analyst import analyze as run_vulnerability_analyst
from backend.agents.fix_engineer import advise as run_fix_engineer
from backend.agents.risk_scorer import score as run_risk_scorer
from backend.agents.sarvam_client import get_api_key
from backend.graph.analyzer import build_and_analyze
from backend.graph.neo4j_client import Neo4jClient
from backend.parser.iam_parser import parse_iam_policy
from backend.parser.k8s_parser import parse_k8s_rbac

logger = logging.getLogger("vektra.workflow_steps")

neo4j_client = Neo4jClient()


async def step_parse(body: Dict) -> Dict:
    step_name = "step-1-parse"
    session_id = body.get("session_id")
    start_time = datetime.now()

    try:
        policy_text = body.get("policy_text")
        format = body.get("format", "iam")

        if format == "iam":
            rules = parse_iam_policy(policy_text)
        else:
            rules = parse_k8s_rbac(policy_text)

        output = {
            "rules_count": len(rules),
            "format": format,
            "rules": [r.dict() for r in rules],
        }

        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "complete",
            output,
            int((datetime.now() - start_time).total_seconds() * 1000),
        )

        return {"session_id": session_id, "step": step_name, "status": "complete", "output": output}
    except Exception as e:
        logger.exception(f"{step_name} failed")
        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "failed",
            {"error": str(e)},
            int((datetime.now() - start_time).total_seconds() * 1000),
        )
        raise


async def step_build_graph(body: Dict) -> Dict:
    step_name = "step-2-graph"
    session_id = body.get("session_id")
    start_time = datetime.now()

    try:
        parse_output = await neo4j_client.get_step_output(session_id, "step-1-parse")
        rules = parse_output.get("rules", [])

        vulnerabilities, edges, critical_paths = build_and_analyze(rules)

        output = {
            "vulnerabilities_count": len(vulnerabilities),
            "edges_count": len(edges),
            "critical_paths_count": len(critical_paths),
            "vulnerabilities": [v.dict() for v in vulnerabilities],
            "edges": [e.dict() for e in edges],
            "critical_paths": critical_paths,
        }

        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "complete",
            output,
            int((datetime.now() - start_time).total_seconds() * 1000),
        )

        return {"session_id": session_id, "step": step_name, "status": "complete", "output": output}
    except Exception as e:
        logger.exception(f"{step_name} failed")
        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "failed",
            {"error": str(e)},
            int((datetime.now() - start_time).total_seconds() * 1000),
        )
        raise


async def step_save_graph(body: Dict) -> Dict:
    step_name = "step-3-neo4j"
    session_id = body.get("session_id")
    start_time = datetime.now()

    try:
        parse_output = await neo4j_client.get_step_output(session_id, "step-1-parse")
        graph_output = await neo4j_client.get_step_output(session_id, "step-2-graph")

        rules = parse_output.get("rules", [])
        edges = graph_output.get("edges", [])

        from backend.graph.models import Rule, Edge

        rule_objects = [Rule(**r) for r in rules]
        edge_objects = [Edge(**e) for e in edges]

        await neo4j_client.clear_session(session_id)
        await neo4j_client.write_rules(rule_objects, session_id)
        await neo4j_client.write_edges(edge_objects, session_id)

        output = {
            "rules_saved": len(rule_objects),
            "edges_saved": len(edge_objects),
        }

        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "complete",
            output,
            int((datetime.now() - start_time).total_seconds() * 1000),
        )

        return {"session_id": session_id, "step": step_name, "status": "complete", "output": output}
    except Exception as e:
        logger.exception(f"{step_name} failed")
        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "failed",
            {"error": str(e)},
            int((datetime.now() - start_time).total_seconds() * 1000),
        )
        raise


async def step_save_history(body: Dict) -> Dict:
    step_name = "step-3-base44"
    session_id = body.get("session_id")
    start_time = datetime.now()

    try:
        # Base44 integration placeholder - would log scan history
        output = {
            "logged": True,
            "service": "base44",
            "session_id": session_id,
        }

        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "complete",
            output,
            int((datetime.now() - start_time).total_seconds() * 1000),
        )

        return {"session_id": session_id, "step": step_name, "status": "complete", "output": output}
    except Exception as e:
        logger.exception(f"{step_name} failed")
        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "failed",
            {"error": str(e)},
            int((datetime.now() - start_time).total_seconds() * 1000),
        )
        raise


async def step_run_analysts(body: Dict) -> Dict:
    step_name = "step-4-agents"
    session_id = body.get("session_id")
    start_time = datetime.now()

    try:
        graph_output = await neo4j_client.get_step_output(session_id, "step-2-graph")
        vulnerabilities = graph_output.get("vulnerabilities", [])
        api_key = get_api_key()

        enriched_vulnerabilities = []
        for vuln in vulnerabilities:
            try:
                enriched = await run_vulnerability_analyst(vuln, api_key)
                enriched_vulnerabilities.append(enriched)
            except Exception as e:
                logger.warning(f"Analyst failed for vulnerability {vuln.get('id')}: {e}")
                enriched_vulnerabilities.append(vuln)

        output = {
            "vulnerabilities_analyzed": len(enriched_vulnerabilities),
            "enriched_vulnerabilities": enriched_vulnerabilities,
        }

        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "complete",
            output,
            int((datetime.now() - start_time).total_seconds() * 1000),
        )

        return {"session_id": session_id, "step": step_name, "status": "complete", "output": output}
    except Exception as e:
        logger.exception(f"{step_name} failed")
        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "failed",
            {"error": str(e)},
            int((datetime.now() - start_time).total_seconds() * 1000),
        )
        raise


async def step_run_fixes(body: Dict) -> Dict:
    step_name = "step-5-fixes"
    session_id = body.get("session_id")
    policy_text = body.get("policy_text")
    start_time = datetime.now()

    try:
        analysts_output = await neo4j_client.get_step_output(session_id, "step-4-agents")
        vulnerabilities = analysts_output.get("enriched_vulnerabilities", [])
        parse_output = await neo4j_client.get_step_output(session_id, "step-1-parse")
        format = parse_output.get("format", "iam")
        api_key = get_api_key()

        fixed_vulnerabilities = []
        for vuln in vulnerabilities:
            if vuln.get("severity") in ["CRITICAL", "WARNING"]:
                try:
                    fixed = await run_fix_engineer(vuln, policy_text, format, api_key)
                    fixed_vulnerabilities.append(fixed)
                except Exception as e:
                    logger.warning(f"Fix engineer failed for vulnerability {vuln.get('id')}: {e}")
                    fixed_vulnerabilities.append(vuln)
            else:
                fixed_vulnerabilities.append(vuln)

        output = {
            "vulnerabilities_fixed": len(fixed_vulnerabilities),
            "fixed_vulnerabilities": fixed_vulnerabilities,
        }

        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "complete",
            output,
            int((datetime.now() - start_time).total_seconds() * 1000),
        )

        return {"session_id": session_id, "step": step_name, "status": "complete", "output": output}
    except Exception as e:
        logger.exception(f"{step_name} failed")
        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "failed",
            {"error": str(e)},
            int((datetime.now() - start_time).total_seconds() * 1000),
        )
        raise


async def step_run_scorer(body: Dict) -> Dict:
    step_name = "step-6-score"
    session_id = body.get("session_id")
    start_time = datetime.now()

    try:
        fixes_output = await neo4j_client.get_step_output(session_id, "step-5-fixes")
        vulnerabilities = fixes_output.get("fixed_vulnerabilities", [])
        api_key = get_api_key()

        score_result = await run_risk_scorer(vulnerabilities, api_key)

        output = score_result

        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "complete",
            output,
            int((datetime.now() - start_time).total_seconds() * 1000),
        )

        return {"session_id": session_id, "step": step_name, "status": "complete", "output": output}
    except Exception as e:
        logger.exception(f"{step_name} failed")
        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "failed",
            {"error": str(e)},
            int((datetime.now() - start_time).total_seconds() * 1000),
        )
        raise


async def step_finalize(body: Dict) -> Dict:
    step_name = "step-7-finalize"
    session_id = body.get("session_id")
    user_id = body.get("user_id")
    start_time = datetime.now()

    try:
        parse_output = await neo4j_client.get_step_output(session_id, "step-1-parse")
        graph_output = await neo4j_client.get_step_output(session_id, "step-2-graph")
        fixes_output = await neo4j_client.get_step_output(session_id, "step-5-fixes")
        score_output = await neo4j_client.get_step_output(session_id, "step-6-score")

        rules = parse_output.get("rules", [])
        edges = graph_output.get("edges", [])
        vulnerabilities = fixes_output.get("fixed_vulnerabilities", [])
        stats = score_output

        # Deduct credits if user_id provided
        credits_deducted = 0
        credits_remaining = None
        if user_id:
            try:
                user = await neo4j_client.get_user_by_id(user_id)
                if user:
                    current_credits = user.get("credits_balance", 0)
                    credits_deducted = 1
                    credits_remaining = max(0, current_credits - credits_deducted)
                    await neo4j_client.update_credits(user_id, credits_remaining)
            except Exception as e:
                logger.warning(f"Failed to deduct credits: {e}")

        # Save scan session
        await neo4j_client.upsert_scan_session(
            session_id,
            parse_output.get("format", "iam"),
            stats,
            parse_output.get("policy_text", "")[:200],
            user_id,
        )

        if user_id:
            await neo4j_client.link_session_to_user(user_id, session_id)
            await neo4j_client.increment_scan_count(user_id)

        output = {
            "session_id": session_id,
            "nodes": rules,
            "edges": edges,
            "vulnerabilities": vulnerabilities,
            "stats": stats,
            "credits_deducted": credits_deducted,
            "credits_remaining": credits_remaining,
            "workflow_complete": True,
        }

        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "complete",
            output,
            int((datetime.now() - start_time).total_seconds() * 1000),
        )

        return {"session_id": session_id, "step": step_name, "status": "complete", "output": output}
    except Exception as e:
        logger.exception(f"{step_name} failed")
        await neo4j_client.save_workflow_state(
            session_id,
            step_name,
            "failed",
            {"error": str(e)},
            int((datetime.now() - start_time).total_seconds() * 1000),
        )
        raise
