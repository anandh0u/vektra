import asyncio
import logging
from typing import Any, Dict, List, Optional, Tuple

from backend.agents import conflict_analyst, fix_advisor, risk_scorer
from backend.graph.models import Rule, Vulnerability


logger = logging.getLogger("vektra.agents.orchestrator")


async def run_agents(
    vulnerabilities: List[Vulnerability],
    policy_text: str,
    format: str,
    api_key: Optional[str] = None,
    rules: Optional[List[Rule]] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    vuln_dicts = [vulnerability.model_dump() for vulnerability in vulnerabilities]
    if not vuln_dicts:
        return [], await risk_scorer.score([], api_key=api_key)

    logger.info("Running Vulnerability Analyst on %s vulnerabilities.", len(vuln_dicts))
    analyst_results = await asyncio.gather(
        *(conflict_analyst.analyze(vuln, api_key=api_key) for vuln in vuln_dicts),
        return_exceptions=True,
    )
    for vulnerability, result in zip(vuln_dicts, analyst_results):
        if isinstance(result, Exception):
            logger.warning("Vulnerability Analyst failed for %s: %s", vulnerability.get("id"), result)
            continue
        vulnerability.update(result)

    fixable = [idx for idx, vuln in enumerate(vuln_dicts) if vuln.get("severity") in {"CRITICAL", "WARNING"}]
    logger.info("Running Fix Engineer on %s vulnerabilities.", len(fixable))
    fix_results = await asyncio.gather(
        *(fix_advisor.advise(vuln_dicts[idx], policy_text, format=format, api_key=api_key) for idx in fixable),
        return_exceptions=True,
    )
    for idx, result in zip(fixable, fix_results):
        if isinstance(result, Exception):
            logger.warning("Fix Engineer failed for %s: %s", vuln_dicts[idx].get("id"), result)
            continue
        vuln_dicts[idx].update(result)

    logger.info("Running Risk Scorer.")
    risk_data = await risk_scorer.score(vuln_dicts, api_key=api_key)
    return vuln_dicts, risk_data
