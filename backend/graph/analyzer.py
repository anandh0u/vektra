import fnmatch
import re
from collections import defaultdict, deque
from typing import Dict, Iterable, List, Optional, Set, Tuple

import networkx as nx

from backend.graph.models import AnalysisResult, Edge, Rule, Vulnerability


SEVERITY_RANK = {"SAFE": 0, "INFO": 1, "WARNING": 2, "CRITICAL": 3}

EDGE_TYPES = {
    "CONFLICTS_WITH",
    "ESCALATES_TO",
    "BYPASSES",
    "SHADOWS",
    "EXPOSES",
    "GRANTS_ADMIN",
    "ASSUMES",
    "REDUNDANT_WITH",
    "INHERITS_FROM",
}

ESCALATION_ACTIONS = {
    "iam:CreatePolicyVersion",
    "iam:SetDefaultPolicyVersion",
    "iam:AttachUserPolicy",
    "iam:AttachRolePolicy",
    "iam:PutUserPolicy",
    "iam:PutRolePolicy",
    "iam:CreateAccessKey",
    "iam:UpdateAssumeRolePolicy",
}

PASSROLE_COMPANIONS = {"ec2:RunInstances", "lambda:CreateFunction"}

SENSITIVE_ACTIONS = {
    "s3:DeleteBucket",
    "s3:DeleteObject",
    "ec2:TerminateInstances",
    "iam:DeleteUser",
    "iam:DeleteRole",
    "rds:DeleteDBInstance",
    "sts:AssumeRole",
}

WRITE_MARKERS = (
    "put",
    "delete",
    "create",
    "write",
    "update",
    "attach",
    "detach",
    "terminate",
    "patch",
    "set",
)

ACCOUNT_RE = re.compile(r"(?:arn:aws:iam::)?(\d{12})(?::|$)")


def _norm(value: str) -> str:
    return str(value).strip().lower()


def _item_overlap(left: str, right: str) -> bool:
    left_n = _norm(left)
    right_n = _norm(right)
    if left_n == "*" or right_n == "*":
        return True
    if "*" in left_n and fnmatch.fnmatchcase(right_n, left_n):
        return True
    if "*" in right_n and fnmatch.fnmatchcase(left_n, right_n):
        return True
    if _arn_prefix_overlap(left_n, right_n):
        return True
    return left_n == right_n


def _arn_prefix_overlap(left_n: str, right_n: str) -> bool:
    if not (left_n.startswith("arn:") and right_n.startswith("arn:")):
        return False
    left_prefix = left_n.rstrip("*").rstrip("/:").strip()
    right_prefix = right_n.rstrip("*").rstrip("/:").strip()
    if left_prefix == right_prefix:
        return True
    return (
        left_prefix.startswith(f"{right_prefix}/")
        or left_prefix.startswith(f"{right_prefix}:")
        or right_prefix.startswith(f"{left_prefix}/")
        or right_prefix.startswith(f"{left_prefix}:")
    )


def _lists_overlap(left: Iterable[str], right: Iterable[str]) -> bool:
    return any(_item_overlap(item_left, item_right) for item_left in left for item_right in right)


def _item_covers(parent: str, child: str) -> bool:
    parent_n = _norm(parent)
    child_n = _norm(child)
    if parent_n == "*":
        return True
    if child_n == "*":
        return parent_n == "*"
    if "*" in parent_n:
        return fnmatch.fnmatchcase(child_n, parent_n)
    if parent_n.startswith("arn:") and child_n.startswith("arn:"):
        parent_prefix = parent_n.rstrip("*").rstrip("/:").strip()
        child_prefix = child_n.rstrip("*").rstrip("/:").strip()
        return (
            child_prefix == parent_prefix
            or child_prefix.startswith(f"{parent_prefix}/")
            or child_prefix.startswith(f"{parent_prefix}:")
        )
    return parent_n == child_n


def _list_covers(parent: Iterable[str], child: Iterable[str]) -> bool:
    parent_list = list(parent)
    child_list = list(child)
    if not child_list:
        return False
    return all(any(_item_covers(parent_item, child_item) for parent_item in parent_list) for child_item in child_list)


def _has_literal_star(items: Iterable[str]) -> bool:
    return any(_norm(item) == "*" for item in items)


def _is_admin_wildcard(rule: Rule) -> bool:
    admin_actions = {"*", "*:*", "iam:*"}
    return rule.effect == "Allow" and _has_literal_star(rule.resources) and any(_norm(a) in admin_actions for a in rule.actions)


def _has_service_wildcard(rule: Rule, fmt: str) -> bool:
    if fmt == "k8s":
        return any(_norm(action) == "*" for action in rule.actions)
    for action in rule.actions:
        action_n = _norm(action)
        if action_n in {"*", "*:*"}:
            continue
        if action_n.endswith(":*") and ":" in action_n:
            return True
    return False


def _is_write_action(action: str) -> bool:
    action_name = _norm(action).split(":", 1)[-1]
    return any(marker in action_name for marker in WRITE_MARKERS)


def _same_actor(left: Rule, right: Rule) -> bool:
    if not left.principals or not right.principals:
        return True
    return _lists_overlap(left.principals, right.principals)


def _role_name(value: str) -> str:
    value = str(value)
    if ":role/" in value:
        return value.rsplit(":role/", 1)[-1].split("/", 1)[0]
    if "/" in value and value.startswith("role/"):
        return value.split("/", 1)[1]
    return value


def _account_id(value: str) -> Optional[str]:
    match = ACCOUNT_RE.search(str(value))
    return match.group(1) if match else None


def _unique(values: Iterable[str]) -> List[str]:
    seen: Set[str] = set()
    out: List[str] = []
    for value in values:
        key = str(value)
        if key not in seen:
            seen.add(key)
            out.append(key)
    return out


def _relationship_target(rule_a: Rule, rule_b: Optional[Rule]) -> str:
    return rule_b.id if rule_b else rule_a.id


def build_and_analyze(rules: List[Rule], format: str = "iam") -> AnalysisResult:
    fmt = format.lower()
    graph = nx.DiGraph()
    for rule in rules:
        graph.add_node(rule.id, **rule.model_dump())

    vulnerabilities: List[Vulnerability] = []
    edges: List[Edge] = []
    seen_vulns: Set[Tuple[str, str, str, Optional[str]]] = set()
    seen_edges: Set[Tuple[str, str, str, str]] = set()

    def add_vulnerability(
        *,
        code: str,
        suffix: str,
        severity: str,
        title: str,
        rule_a: Rule,
        rule_b: Optional[Rule] = None,
        edge_type: str,
    ) -> None:
        key = (code, suffix, rule_a.id, rule_b.id if rule_b else None)
        if key in seen_vulns:
            return
        seen_vulns.add(key)

        vuln_id = f"{code}-{len(vulnerabilities) + 1:03d}"
        affected_rules = [rule_a.id]
        if rule_b and rule_b.id != rule_a.id:
            affected_rules.append(rule_b.id)

        vulnerability = Vulnerability(
            id=vuln_id,
            severity=severity,
            type=f"{code}_{suffix}",
            code=code,
            title=title,
            rule_a=rule_a.id,
            rule_b=rule_b.id if rule_b else None,
            affected_rules=affected_rules,
            actions=_unique([*rule_a.actions, *((rule_b.actions if rule_b else []))]),
            resources=_unique([*rule_a.resources, *((rule_b.resources if rule_b else []))]),
            effect_a=rule_a.effect,
            effect_b=rule_b.effect if rule_b else None,
            edge_type=edge_type,
        )
        vulnerabilities.append(vulnerability)

        safe_edge_type = edge_type if edge_type in EDGE_TYPES else "CONFLICTS_WITH"
        target = _relationship_target(rule_a, rule_b)
        edge_key = (rule_a.id, target, safe_edge_type, vuln_id)
        if edge_key not in seen_edges:
            seen_edges.add(edge_key)
            edges.append(
                Edge(
                    source=rule_a.id,
                    target=target,
                    type=safe_edge_type,
                    severity=severity,
                    vulnerability_id=vuln_id,
                )
            )

    # Pair-wise IAM and general redundancy checks.
    for i, rule_a in enumerate(rules):
        for j in range(i + 1, len(rules)):
            rule_b = rules[j]

            if fmt == "iam" and not _same_actor(rule_a, rule_b):
                continue

            actions_overlap = _lists_overlap(rule_a.actions, rule_b.actions)
            resources_overlap = _lists_overlap(rule_a.resources, rule_b.resources)

            if actions_overlap and resources_overlap:
                if fmt == "iam" and {rule_a.effect, rule_b.effect} == {"Allow", "Deny"}:
                    allow_rule = rule_a if rule_a.effect == "Allow" else rule_b
                    deny_rule = rule_b if allow_rule is rule_a else rule_a
                    add_vulnerability(
                        code="V01",
                        suffix="ALLOW_DENY_DIRECT_CONFLICT",
                        severity="CRITICAL",
                        title="Direct Allow/Deny conflict on overlapping permission scope",
                        rule_a=allow_rule,
                        rule_b=deny_rule,
                        edge_type="CONFLICTS_WITH",
                    )

                if rule_a.effect == rule_b.effect == "Allow":
                    if _list_covers(rule_a.actions, rule_b.actions) and _list_covers(rule_a.resources, rule_b.resources):
                        if sorted(map(_norm, rule_a.actions)) != sorted(map(_norm, rule_b.actions)) or sorted(
                            map(_norm, rule_a.resources)
                        ) != sorted(map(_norm, rule_b.resources)):
                            add_vulnerability(
                                code="V09",
                                suffix="REDUNDANT_ALLOW_SHADOW",
                                severity="WARNING",
                                title=f"{rule_a.id} shadows the narrower allow in {rule_b.id}",
                                rule_a=rule_a,
                                rule_b=rule_b,
                                edge_type="SHADOWS",
                            )
                    elif _list_covers(rule_b.actions, rule_a.actions) and _list_covers(rule_b.resources, rule_a.resources):
                        add_vulnerability(
                            code="V09",
                            suffix="REDUNDANT_ALLOW_SHADOW",
                            severity="WARNING",
                            title=f"{rule_b.id} shadows the narrower allow in {rule_a.id}",
                            rule_a=rule_b,
                            rule_b=rule_a,
                            edge_type="SHADOWS",
                        )

            duplicate_signature_a = (
                rule_a.effect,
                tuple(sorted(map(_norm, rule_a.actions))),
                tuple(sorted(map(_norm, rule_a.resources))),
                tuple(sorted(map(_norm, rule_a.principals))),
            )
            duplicate_signature_b = (
                rule_b.effect,
                tuple(sorted(map(_norm, rule_b.actions))),
                tuple(sorted(map(_norm, rule_b.resources))),
                tuple(sorted(map(_norm, rule_b.principals))),
            )
            if duplicate_signature_a == duplicate_signature_b:
                add_vulnerability(
                    code="V14",
                    suffix="DUPLICATE_STATEMENT",
                    severity="INFO",
                    title="Duplicate permission statement detected",
                    rule_a=rule_a,
                    rule_b=rule_b,
                    edge_type="REDUNDANT_WITH",
                )

    # Single-rule classes.
    for rule in rules:
        if fmt == "iam" and ("NotAction" in rule.raw or "NotResource" in rule.raw):
            add_vulnerability(
                code="V12",
                suffix="NEGATED_SCOPE_REVIEW",
                severity="WARNING",
                title="NotAction or NotResource uses inverted permission scope and requires explicit review",
                rule_a=rule,
                edge_type="BYPASSES",
            )

        if rule.effect == "Allow":
            has_escalation = _lists_overlap(rule.actions, ESCALATION_ACTIONS)
            has_passrole = _lists_overlap(rule.actions, ["iam:PassRole"])
            if fmt == "iam" and has_passrole:
                has_companion = any(
                    other.effect == "Allow"
                    and _same_actor(rule, other)
                    and _lists_overlap(other.actions, PASSROLE_COMPANIONS)
                    for other in rules
                )
                has_escalation = has_escalation or has_companion or _lists_overlap(rule.actions, ["iam:*", "*"])
            if fmt == "iam" and has_escalation:
                add_vulnerability(
                    code="V02",
                    suffix="PRIVILEGE_ESCALATION_PATH",
                    severity="CRITICAL",
                    title="Permission can grant or construct higher privileges",
                    rule_a=rule,
                    edge_type="ESCALATES_TO",
                )

            if fmt == "iam" and _has_literal_star(rule.resources) and _lists_overlap(rule.actions, SENSITIVE_ACTIONS):
                add_vulnerability(
                    code="V03",
                    suffix="WILDCARD_RESOURCE_ON_SENSITIVE_ACTION",
                    severity="CRITICAL",
                    title="Sensitive action is allowed against every resource",
                    rule_a=rule,
                    edge_type="EXPOSES",
                )

            if fmt == "iam" and _is_admin_wildcard(rule):
                add_vulnerability(
                    code="V04",
                    suffix="ADMIN_WILDCARD",
                    severity="CRITICAL",
                    title="Full administrative wildcard permission granted",
                    rule_a=rule,
                    edge_type="GRANTS_ADMIN",
                )

            if _has_service_wildcard(rule, fmt):
                add_vulnerability(
                    code="V07",
                    suffix="WILDCARD_ACTION_ON_SERVICE",
                    severity="WARNING",
                    title="Wildcard action grants every operation in a service or role scope",
                    rule_a=rule,
                    edge_type="EXPOSES",
                )

            if fmt == "iam" and _has_literal_star(rule.resources) and any(_is_write_action(action) for action in rule.actions):
                add_vulnerability(
                    code="V12",
                    suffix="MISSING_RESOURCE_CONSTRAINT",
                    severity="WARNING",
                    title="Write-class action is allowed without a resource constraint",
                    rule_a=rule,
                    edge_type="EXPOSES",
                )

        if rule.effect == "Deny" and rule.conditions:
            add_vulnerability(
                code="V08",
                suffix="DENY_CONDITION_BYPASS",
                severity="WARNING",
                title="Conditional deny may be bypassed by changing request context",
                rule_a=rule,
                edge_type="BYPASSES",
            )

        if rule.effect == "Deny":
            has_matching_allow = any(
                other.effect == "Allow"
                and _same_actor(rule, other)
                and _lists_overlap(rule.actions, other.actions)
                and _lists_overlap(rule.resources, other.resources)
                for other in rules
            )
            if not has_matching_allow:
                add_vulnerability(
                    code="V13",
                    suffix="UNUSED_DENY",
                    severity="INFO",
                    title="Deny statement has no matching allow to block",
                    rule_a=rule,
                    edge_type="REDUNDANT_WITH",
                )

        if fmt == "iam" and rule.role_type == "TrustPolicy":
            owner_account = rule.owner_account
            for principal in rule.principals:
                principal_account = _account_id(principal)
                if principal == "*" or (principal_account and owner_account and principal_account != owner_account):
                    add_vulnerability(
                        code="V10",
                        suffix="CROSS_ACCOUNT_TRUST",
                        severity="WARNING",
                        title="Role trust policy allows an external or wildcard principal",
                        rule_a=rule,
                        edge_type="ASSUMES",
                    )
                elif principal_account and not owner_account:
                    add_vulnerability(
                        code="V10",
                        suffix="CROSS_ACCOUNT_TRUST",
                        severity="WARNING",
                        title="Role trust policy allows a principal from an explicit AWS account",
                        rule_a=rule,
                        edge_type="ASSUMES",
                    )

        if fmt == "k8s" and "secrets" in {_norm(resource) for resource in rule.resources}:
            if _lists_overlap(rule.verbs or rule.actions, ["get", "list", "watch", "*"]):
                add_vulnerability(
                    code="V11",
                    suffix="K8S_SECRETS_ACCESS",
                    severity="WARNING",
                    title="RBAC grants read access to Kubernetes secrets",
                    rule_a=rule,
                    edge_type="EXPOSES",
                )

    # V06 Kubernetes namespace bypass.
    if fmt == "k8s":
        cluster_rules = [rule for rule in rules if rule.binding_kind == "ClusterRoleBinding"]
        namespace_rules = [rule for rule in rules if rule.binding_kind == "RoleBinding"]
        for cluster_rule in cluster_rules:
            broad_cluster_rule = _lists_overlap(cluster_rule.verbs or cluster_rule.actions, ["*"]) or _lists_overlap(
                cluster_rule.verbs or cluster_rule.actions,
                ["create", "delete"],
            )
            if not broad_cluster_rule:
                continue
            for namespace_rule in namespace_rules:
                shared_principals = set(cluster_rule.principals) & set(namespace_rule.principals)
                if shared_principals:
                    add_vulnerability(
                        code="V06",
                        suffix="K8S_CLUSTERROLE_NAMESPACE_BYPASS",
                        severity="CRITICAL",
                        title=f"ClusterRoleBinding bypasses namespace restrictions for {sorted(shared_principals)[0]}",
                        rule_a=cluster_rule,
                        rule_b=namespace_rule,
                        edge_type="BYPASSES",
                    )

    # V05 AWS assume-role chain escalation.
    if fmt == "iam":
        role_admin_rules: Dict[str, Rule] = {}
        for rule in rules:
            if rule.effect != "Allow":
                continue
            if _is_admin_wildcard(rule) or (_has_literal_star(rule.resources) and _lists_overlap(rule.actions, SENSITIVE_ACTIONS)):
                for principal in rule.principals:
                    if principal != "*":
                        role_admin_rules[_role_name(principal)] = rule
                if rule.role_name:
                    role_admin_rules[rule.role_name] = rule

        assume_graph: Dict[str, Set[str]] = defaultdict(set)
        assume_rule_lookup: Dict[Tuple[str, str], Rule] = {}
        for rule in rules:
            if rule.effect != "Allow" or not _lists_overlap(rule.actions, ["sts:AssumeRole"]):
                continue
            target_roles = [_role_name(resource) for resource in rule.resources if resource != "*"]
            if rule.role_type == "TrustPolicy" and rule.role_name:
                target_roles.append(rule.role_name)
            for principal in rule.principals:
                if principal == "*":
                    continue
                source_role = _role_name(principal)
                for target_role in target_roles:
                    if source_role and target_role and source_role != target_role:
                        assume_graph[source_role].add(target_role)
                        assume_rule_lookup[(source_role, target_role)] = rule

        for source_role in list(assume_graph):
            queue: deque[Tuple[str, Optional[str]]] = deque((target, target) for target in assume_graph[source_role])
            visited: Set[str] = set()
            while queue:
                current_role, first_hop = queue.popleft()
                if current_role in visited:
                    continue
                visited.add(current_role)
                if current_role in role_admin_rules and first_hop:
                    assume_rule = assume_rule_lookup.get((source_role, first_hop)) or role_admin_rules[current_role]
                    add_vulnerability(
                        code="V05",
                        suffix="ASSUME_ROLE_CHAIN_ESCALATION",
                        severity="CRITICAL",
                        title=f"{source_role} can reach admin privileges through an assume-role chain",
                        rule_a=assume_rule,
                        rule_b=role_admin_rules[current_role],
                        edge_type="ESCALATES_TO",
                    )
                    break
                for next_role in assume_graph.get(current_role, set()):
                    queue.append((next_role, first_hop))

    for edge in edges:
        graph.add_edge(edge.source, edge.target, type=edge.type, severity=edge.severity, vulnerability_id=edge.vulnerability_id)

    centrality = nx.degree_centrality(graph) if graph.number_of_nodes() > 1 else {rule.id: 0.0 for rule in rules}
    most_dangerous_rule = max(centrality, key=centrality.get) if centrality else None

    for rule in rules:
        attached = [vuln for vuln in vulnerabilities if rule.id in vuln.affected_rules]
        if attached:
            rule.severity = max((vuln.severity for vuln in attached), key=lambda severity: SEVERITY_RANK[severity])
        else:
            rule.severity = "SAFE"
        rule.centrality_score = float(centrality.get(rule.id, 0.0))

    return AnalysisResult(
        rules=rules,
        edges=edges,
        conflicts=vulnerabilities,
        most_dangerous_rule=most_dangerous_rule,
    )
