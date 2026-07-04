import json
from typing import Any, Dict, Optional

from backend.agents.sarvam_client import chat_json


SYSTEM_PROMPT = """
You are VEKTRA's Fix Engineer. You produce concrete, copy-pasteable policy
fixes for cloud permission vulnerabilities.

Rules:
- For AWS IAM: output a valid JSON Statement block.
- For Kubernetes RBAC: output a valid YAML rule block.
- Include a comment line above the fix explaining what changed and why.
- Never suggest removing all permissions; suggest the minimal permission that
  still preserves likely intent.
- Respond in valid JSON only.

Respond only in this exact JSON format:
{
  "fix_description": "string",
  "fixed_policy_block": "string",
  "what_changed": "string",
  "confidence": "HIGH",
  "principle_applied": "string"
}
"""


def _null_result() -> Dict[str, Any]:
    return {
        "fix_description": None,
        "fixed_policy_block": None,
        "what_changed": None,
        "confidence": None,
        "principle_applied": None,
    }


async def advise(
    vulnerability: Dict[str, Any],
    policy_text: str,
    format: str = "iam",
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    user_prompt = f"""
Generate a fix for this vulnerability:
{json.dumps(vulnerability, indent=2)}

Full policy context:
{policy_text[:2000]}

Policy format: {format}
"""
    data = await chat_json(SYSTEM_PROMPT, user_prompt, api_key=api_key)
    fallback = _null_result()
    if not data:
        return fallback

    confidence = data.get("confidence")
    if confidence not in {"HIGH", "MEDIUM", "LOW"}:
        confidence = None

    return {
        "fix_description": data.get("fix_description") or fallback["fix_description"],
        "fixed_policy_block": data.get("fixed_policy_block") or fallback["fixed_policy_block"],
        "what_changed": data.get("what_changed") or fallback["what_changed"],
        "confidence": confidence,
        "principle_applied": data.get("principle_applied") or fallback["principle_applied"],
    }
