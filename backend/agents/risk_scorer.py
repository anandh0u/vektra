import json
from typing import Any, Dict, List, Optional

from backend.agents.sarvam_client import chat_json


SYSTEM_PROMPT = """
You are VEKTRA's Risk Scorer. You receive a complete list of vulnerabilities
detected in a cloud permission policy and produce an executive-level security
assessment.

Scoring formula:
- Each CRITICAL vulnerability: +25 points, cap 75
- Each WARNING vulnerability: +10 points, cap 20
- Each INFO vulnerability: +2 points, cap 5
- Total cap: 100

Respond only in this exact JSON format:
{
  "risk_score": 0,
  "risk_label": "LOW",
  "executive_summary": "string",
  "top_3_priorities": ["string", "string", "string"],
  "compliance_notes": "string"
}
"""


def calculate_base_score(vulnerabilities: List[Dict[str, Any]]) -> int:
    criticals = sum(1 for vuln in vulnerabilities if vuln.get("severity") == "CRITICAL")
    warnings = sum(1 for vuln in vulnerabilities if vuln.get("severity") == "WARNING")
    infos = sum(1 for vuln in vulnerabilities if vuln.get("severity") == "INFO")
    return min(criticals * 25, 75) + min(warnings * 10, 20) + min(infos * 2, 5)


def risk_label(score: int) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 50:
        return "HIGH"
    if score >= 20:
        return "MEDIUM"
    return "LOW"


def _priorities(vulnerabilities: List[Dict[str, Any]]) -> List[str]:
    ordered = sorted(
        vulnerabilities,
        key=lambda vuln: {"CRITICAL": 3, "WARNING": 2, "INFO": 1}.get(vuln.get("severity"), 0),
        reverse=True,
    )
    priorities = [f"Resolve {vuln.get('type')}: {vuln.get('title')}" for vuln in ordered[:3]]
    while len(priorities) < 3:
        priorities.append("Review least-privilege boundaries and rerun VEKTRA after changes.")
    return priorities


def _fallback(vulnerabilities: List[Dict[str, Any]], score_value: int) -> Dict[str, Any]:
    criticals = sum(1 for vuln in vulnerabilities if vuln.get("severity") == "CRITICAL")
    warnings = sum(1 for vuln in vulnerabilities if vuln.get("severity") == "WARNING")
    infos = sum(1 for vuln in vulnerabilities if vuln.get("severity") == "INFO")
    label = risk_label(score_value)
    return {
        "risk_score": score_value,
        "risk_label": label,
        "executive_summary": (
            f"VEKTRA found {criticals} critical, {warnings} warning, and {infos} informational "
            f"policy vulnerabilities. Overall exposure is rated {label} based on graph-derived permission paths."
        ),
        "top_3_priorities": _priorities(vulnerabilities),
        "top_priorities": _priorities(vulnerabilities),
        "compliance_notes": "Review against SOC 2, ISO 27001, PCI-DSS, and CIS Benchmark least-privilege controls.",
    }


async def score(vulnerabilities: List[Dict[str, Any]], api_key: Optional[str] = None) -> Dict[str, Any]:
    base_score = calculate_base_score(vulnerabilities)
    if not vulnerabilities:
        return {
            "risk_score": 0,
            "risk_label": "LOW",
            "executive_summary": "No policy vulnerabilities were detected by the graph analyzer.",
            "top_3_priorities": ["No immediate remediation required.", "Keep reviewing future policy changes.", "Rerun scans after updates."],
            "top_priorities": ["No immediate remediation required.", "Keep reviewing future policy changes.", "Rerun scans after updates."],
            "compliance_notes": "No obvious least-privilege issues were detected in this scan.",
        }

    user_prompt = f"Score the overall security risk of these vulnerabilities:\n{json.dumps(vulnerabilities, indent=2)}"
    data = await chat_json(SYSTEM_PROMPT, user_prompt, api_key=api_key)
    fallback = _fallback(vulnerabilities, base_score)
    if not data:
        return fallback

    try:
        score_value = max(0, min(int(data.get("risk_score", base_score)), 100))
    except (TypeError, ValueError):
        score_value = base_score

    priorities = data.get("top_3_priorities") or data.get("top_priorities") or fallback["top_3_priorities"]
    priorities = list(priorities)[:3]
    while len(priorities) < 3:
        priorities.append("Review remaining vulnerable policy paths.")

    label = data.get("risk_label") or risk_label(score_value)
    if label not in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}:
        label = risk_label(score_value)

    return {
        "risk_score": score_value,
        "risk_label": label,
        "executive_summary": data.get("executive_summary") or fallback["executive_summary"],
        "top_3_priorities": priorities,
        "top_priorities": priorities,
        "compliance_notes": data.get("compliance_notes") or fallback["compliance_notes"],
    }
