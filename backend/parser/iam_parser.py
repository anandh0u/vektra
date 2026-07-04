import json
import re
from typing import Any, Dict, Iterable, List, Optional

from backend.graph.models import Rule


ACCOUNT_RE = re.compile(r"arn:aws:iam::(\d{12}):")


def _as_list(value: Any) -> List[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _string_list(value: Any) -> List[str]:
    return [str(item) for item in _as_list(value) if item is not None]


def _extract_principals(value: Any) -> List[str]:
    if value in (None, {}):
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, dict):
        principals: List[str] = []
        for principal_value in value.values():
            principals.extend(_string_list(principal_value))
        return principals
    return [str(value)]


def _account_from_values(values: Iterable[str]) -> Optional[str]:
    for value in values:
        match = ACCOUNT_RE.search(value)
        if match:
            return match.group(1)
    return None


def _role_identifier(doc: Dict[str, Any]) -> Optional[str]:
    return (
        doc.get("RoleName")
        or doc.get("roleName")
        or doc.get("name")
        or doc.get("metadata", {}).get("name")
    )


def _role_arn(doc: Dict[str, Any], role_name: Optional[str], owner_account: Optional[str]) -> Optional[str]:
    arn = doc.get("Arn") or doc.get("RoleArn") or doc.get("roleArn")
    if arn:
        return str(arn)
    if role_name and owner_account:
        return f"arn:aws:iam::{owner_account}:role/{role_name}"
    return role_name


def _parse_statements(
    policy_doc: Dict[str, Any],
    *,
    source_file: str,
    principal_override: Optional[List[str]] = None,
    role_name: Optional[str] = None,
    role_type: Optional[str] = None,
    owner_account: Optional[str] = None,
    default_resources: Optional[List[str]] = None,
    id_prefix: str = "stmt",
) -> List[Rule]:
    statements = policy_doc.get("Statement", [])
    if isinstance(statements, dict):
        statements = [statements]

    rules: List[Rule] = []
    for idx, stmt in enumerate(statements):
        if not isinstance(stmt, dict):
            continue

        actions = _string_list(stmt.get("Action") or stmt.get("NotAction"))
        resources = _string_list(stmt.get("Resource") or stmt.get("NotResource"))
        if not resources and default_resources:
            resources = default_resources
        if not resources:
            resources = ["*"]

        principals = principal_override or _extract_principals(stmt.get("Principal"))
        if not principals:
            principals = [role_name] if role_name else ["*"]

        discovered_owner = (
            owner_account
            or policy_doc.get("OwnerAccountId")
            or policy_doc.get("AccountId")
            or _account_from_values(resources)
        )

        conditions = dict(stmt.get("Condition", {}) or {})
        if "NotAction" in stmt:
            conditions["_vektra_not_action"] = True
        if "NotResource" in stmt:
            conditions["_vektra_not_resource"] = True

        statement_id = str(stmt.get("Sid") or f"{id_prefix}-{idx}")
        rules.append(
            Rule(
                id=statement_id,
                effect=str(stmt.get("Effect", "Allow")),
                actions=actions,
                resources=resources,
                principals=[str(principal) for principal in principals],
                conditions=conditions,
                source_file=source_file,
                role_type=role_type,
                role_name=role_name,
                owner_account=discovered_owner,
                raw=stmt,
            )
        )

    return rules


def _parse_role_document(doc: Dict[str, Any], index: int) -> List[Rule]:
    owner_account = (
        doc.get("OwnerAccountId")
        or doc.get("AccountId")
        or _account_from_values(_string_list(doc.get("Arn") or doc.get("RoleArn")))
    )
    role_name = _role_identifier(doc) or f"role-{index}"
    role_resource = _role_arn(doc, role_name, owner_account)
    rules: List[Rule] = []

    trust_doc = doc.get("AssumeRolePolicyDocument")
    if isinstance(trust_doc, str):
        trust_doc = json.loads(trust_doc)
    if isinstance(trust_doc, dict):
        rules.extend(
            _parse_statements(
                trust_doc,
                source_file=f"Trust Policy/{role_name}",
                role_name=role_name,
                role_type="TrustPolicy",
                owner_account=owner_account,
                default_resources=[role_resource] if role_resource else [role_name],
                id_prefix=f"trust-{role_name}",
            )
        )

    policy_documents: List[Dict[str, Any]] = []
    if isinstance(doc.get("PolicyDocument"), dict):
        policy_documents.append(doc["PolicyDocument"])
    for policy in _as_list(doc.get("Policies")):
        if isinstance(policy, dict) and isinstance(policy.get("PolicyDocument"), dict):
            policy_documents.append(policy["PolicyDocument"])

    for p_idx, policy_doc in enumerate(policy_documents):
        rules.extend(
            _parse_statements(
                policy_doc,
                source_file=f"Permission Policy/{role_name}",
                principal_override=[role_name],
                role_name=role_name,
                role_type="RolePolicy",
                owner_account=owner_account,
                id_prefix=f"role-{role_name}-policy-{p_idx}",
            )
        )

    return rules


def parse_iam_policy(policy_text: str) -> List[Rule]:
    try:
        policy = json.loads(policy_text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON format: {exc}") from exc

    if isinstance(policy, list):
        rules: List[Rule] = []
        for index, item in enumerate(policy):
            if isinstance(item, dict):
                rules.extend(_parse_role_document(item, index))
                if "Statement" in item and "AssumeRolePolicyDocument" not in item:
                    rules.extend(
                        _parse_statements(
                            item,
                            source_file="AWS IAM Policy",
                            owner_account=item.get("OwnerAccountId") or item.get("AccountId"),
                        )
                    )
        return rules

    if not isinstance(policy, dict):
        raise ValueError("IAM policy must be a JSON object or list of role objects.")

    if "AssumeRolePolicyDocument" in policy or "Policies" in policy or "PolicyDocument" in policy:
        role_rules = _parse_role_document(policy, 0)
        if role_rules:
            return role_rules

    if "Statement" not in policy:
        raise ValueError("IAM policy document must contain a Statement block.")

    return _parse_statements(
        policy,
        source_file="AWS IAM Policy",
        owner_account=policy.get("OwnerAccountId") or policy.get("AccountId"),
    )
