from typing import Any, Dict, List

import yaml

from backend.graph.models import Rule


WELL_KNOWN_ROLES = {
    "cluster-admin": [{"verbs": ["*"], "resources": ["*"], "apiGroups": ["*"]}],
    "admin": [{"verbs": ["*"], "resources": ["*"], "apiGroups": ["*"]}],
    "edit": [
        {
            "verbs": ["get", "list", "watch", "create", "update", "patch", "delete"],
            "resources": ["*"],
            "apiGroups": ["*"],
        }
    ],
    "view": [{"verbs": ["get", "list", "watch"], "resources": ["*"], "apiGroups": ["*"]}],
}


def _as_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value]
    return [str(value)]


def _principal(subject: Dict[str, Any], binding_namespace: str | None) -> str:
    kind = subject.get("kind", "Subject")
    name = subject.get("name", "unknown")
    namespace = subject.get("namespace") or binding_namespace
    if kind == "ServiceAccount" and namespace:
        return f"{kind}:{namespace}/{name}"
    return f"{kind}:{name}"


def parse_k8s_rbac(policy_text: str) -> List[Rule]:
    try:
        documents = list(yaml.safe_load_all(policy_text))
    except Exception as exc:
        raise ValueError(f"Invalid YAML format: {exc}") from exc

    roles: Dict[str, Dict[str, Any]] = {}
    bindings: List[Dict[str, Any]] = []

    for doc in documents:
        if not isinstance(doc, dict):
            continue
        kind = doc.get("kind")
        name = doc.get("metadata", {}).get("name")
        namespace = doc.get("metadata", {}).get("namespace")
        if not kind or not name:
            continue
        key = f"{kind}:{namespace or '_cluster'}:{name}"
        if kind in ("Role", "ClusterRole"):
            roles[key] = doc
        elif kind in ("RoleBinding", "ClusterRoleBinding"):
            bindings.append(doc)

    rules: List[Rule] = []

    for binding in bindings:
        binding_kind = binding.get("kind")
        binding_name = binding.get("metadata", {}).get("name")
        binding_namespace = binding.get("metadata", {}).get("namespace")
        role_ref = binding.get("roleRef", {}) or {}
        ref_kind = role_ref.get("kind")
        ref_name = role_ref.get("name")
        role_namespace = binding_namespace if ref_kind == "Role" else "_cluster"
        role_key = f"{ref_kind}:{role_namespace or '_cluster'}:{ref_name}"

        subjects = binding.get("subjects", []) or []
        principals = [_principal(subject, binding_namespace) for subject in subjects if subject.get("name")]
        if not principals:
            continue

        role_rules = []
        if role_key in roles:
            role_rules = roles[role_key].get("rules", []) or []
        elif ref_name in WELL_KNOWN_ROLES:
            role_rules = WELL_KNOWN_ROLES[ref_name]
        else:
            role_rules = [{"verbs": ["*"], "resources": ["*"], "apiGroups": ["*"]}]

        for idx, role_rule in enumerate(role_rules):
            verbs = _as_list(role_rule.get("verbs"))
            resources = _as_list(role_rule.get("resources"))
            api_groups = _as_list(role_rule.get("apiGroups"))
            rule_id = f"{binding_kind}/{binding_name}/{ref_kind}/{ref_name}/rule-{idx}"
            rules.append(
                Rule(
                    id=rule_id,
                    effect="Allow",
                    actions=verbs,
                    verbs=verbs,
                    resources=resources,
                    principals=principals,
                    conditions={},
                    api_groups=api_groups,
                    namespace=binding_namespace,
                    role_type=ref_kind,
                    role_name=ref_name,
                    binding_kind=binding_kind,
                    binding_name=binding_name,
                    source_file=f"{ref_kind}/{ref_name}",
                    raw=role_rule,
                )
            )

    bound_role_keys = {
        f"{binding.get('roleRef', {}).get('kind')}:{(binding.get('metadata', {}).get('namespace') if binding.get('roleRef', {}).get('kind') == 'Role' else '_cluster') or '_cluster'}:{binding.get('roleRef', {}).get('name')}"
        for binding in bindings
    }

    for role_key, role in roles.items():
        if role_key in bound_role_keys:
            continue
        kind = role.get("kind")
        name = role.get("metadata", {}).get("name")
        namespace = role.get("metadata", {}).get("namespace")
        for idx, role_rule in enumerate(role.get("rules", []) or []):
            verbs = _as_list(role_rule.get("verbs"))
            resources = _as_list(role_rule.get("resources"))
            api_groups = _as_list(role_rule.get("apiGroups"))
            rules.append(
                Rule(
                    id=f"Unbound/{kind}/{name}/rule-{idx}",
                    effect="Allow",
                    actions=verbs,
                    verbs=verbs,
                    resources=resources,
                    principals=["Unbound"],
                    conditions={},
                    api_groups=api_groups,
                    namespace=namespace,
                    role_type=kind,
                    role_name=name,
                    source_file=f"{kind}/{name}",
                    raw=role_rule,
                )
            )

    return rules
