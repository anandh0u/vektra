import json
from typing import Any, Dict, Optional

from backend.agents.sarvam_client import chat_json


SYSTEM_PROMPT = """
You are VEKTRA's Vulnerability Analyst. You analyze cloud permission policy
vulnerabilities in AWS IAM and Kubernetes RBAC configurations. You are precise,
technical, and concise. You always respond in valid JSON only.

Respond only in this exact JSON format:
{
  "danger_summary": "string",
  "attack_scenario": "string",
  "exploitability_score": 1,
  "attacker_capability_required": "string"
}
"""


def _fallback(vulnerability: Dict[str, Any]) -> Dict[str, Any]:
    severity_scores = {"CRITICAL": 9, "WARNING": 6, "INFO": 2}
    title = vulnerability.get("title") or vulnerability.get("type") or "Policy vulnerability"
    actions = ", ".join(vulnerability.get("actions") or [])
    resources = ", ".join(vulnerability.get("resources") or [])
    return {
        "danger_summary": f"{title} affects actions [{actions}] on resources [{resources}].",
        "attack_scenario": "An attacker with access to the affected principal could exploit the overly broad or conflicting permission path.",
        "exploitability_score": severity_scores.get(vulnerability.get("severity"), 5),
        "attacker_capability_required": "Access to a principal covered by the affected rule.",
    }


async def analyze(vulnerability: Dict[str, Any], api_key: Optional[str] = None) -> Dict[str, Any]:
    user_prompt = f"Analyze this cloud policy vulnerability:\n{json.dumps(vulnerability, indent=2)}"
    data = await chat_json(SYSTEM_PROMPT, user_prompt, api_key=api_key)
    if not data:
        return _fallback(vulnerability)

    fallback = _fallback(vulnerability)
    return {
        "danger_summary": data.get("danger_summary") or fallback["danger_summary"],
        "attack_scenario": data.get("attack_scenario") or fallback["attack_scenario"],
        "exploitability_score": int(data.get("exploitability_score") or fallback["exploitability_score"]),
        "attacker_capability_required": data.get("attacker_capability_required")
        or fallback["attacker_capability_required"],
    }
