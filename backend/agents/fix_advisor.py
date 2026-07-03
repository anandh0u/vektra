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

Respond only in this exact JSON format:
{
  "fix_description": "string",
  "fixed_policy_block": "string",
  "what_changed": "string",
  "confidence": "HIGH",
  "principle_applied": "string"
}
"""


def _fallback(vulnerability: Dict[str, Any], fmt: str) -> Dict[str, Any]:
    actions = vulnerability.get("actions") or []
    resources = [resource for resource in vulnerability.get("resources") or [] if resource != "*"]
    if fmt == "k8s":
        block = (
            "# Narrow the RBAC rule to the resources and verbs the workload actually needs.\n"
            "rules:\n"
            "- apiGroups: [\"\"]\n"
            f"  resources: {json.dumps(resources or ['pods'])}\n"
            f"  verbs: {json.dumps([a for a in actions if a != '*'] or ['get', 'list'])}"
        )
    else:
        block = json.dumps(
            {
                "Sid": "VektraLeastPrivilegeFix",
                "Effect": "Allow",
                "Action": [a for a in actions if a not in ("*", "*:*")] or ["service:ReadAction"],
                "Resource": resources or ["arn:aws:service:region:account-id:resource/specific-id"],
            },
            indent=2,
        )
        block = "// Replace wildcard scope with least-privilege actions and resource ARNs.\n" + block

    return {
        "fix_description": "Replace broad or conflicting access with the narrowest action and resource scope that matches the workload.",
        "fixed_policy_block": block,
        "what_changed": "Wildcard or conflicting permission scope was narrowed to an explicit allow block.",
        "confidence": "MEDIUM",
        "principle_applied": "Least privilege",
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
    fallback = _fallback(vulnerability, format)
    if not data:
        return fallback

    confidence = data.get("confidence") or fallback["confidence"]
    if confidence not in {"HIGH", "MEDIUM", "LOW"}:
        confidence = "LOW"

    return {
        "fix_description": data.get("fix_description") or fallback["fix_description"],
        "fixed_policy_block": data.get("fixed_policy_block") or fallback["fixed_policy_block"],
        "what_changed": data.get("what_changed") or fallback["what_changed"],
        "confidence": confidence,
        "principle_applied": data.get("principle_applied") or fallback["principle_applied"],
    }
