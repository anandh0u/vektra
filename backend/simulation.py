import hashlib
import json
from typing import Callable

from backend.graph.analyzer import build_and_analyze
from backend.graph.models import AnalysisResult, Rule, Vulnerability
from backend.parser.iam_parser import parse_iam_policy
from backend.parser.k8s_parser import parse_k8s_rbac


SEVERITY_WEIGHT = {"CRITICAL": 25, "WARNING": 10, "INFO": 2, "SAFE": 0}


def _parse(policy_text: str, policy_format: str) -> list[Rule]:
    parsers: dict[str, Callable[[str], list[Rule]]] = {
        "iam": parse_iam_policy,
        "k8s": parse_k8s_rbac,
    }
    rules = parsers[policy_format](policy_text)
    if not rules:
        raise ValueError("No valid statements or rules were detected.")
    return rules


def _rule_key(rule: Rule) -> str:
    payload = {
        "effect": rule.effect,
        "actions": sorted(rule.actions),
        "resources": sorted(rule.resources),
        "principals": sorted(rule.principals),
        "conditions": rule.conditions,
        "verbs": sorted(rule.verbs),
        "api_groups": sorted(rule.api_groups),
        "namespace": rule.namespace,
        "role_type": rule.role_type,
        "role_name": rule.role_name,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


def _vulnerability_key(vulnerability: Vulnerability, rules_by_id: dict[str, Rule]) -> str:
    affected = sorted(
        _rule_key(rules_by_id[rule_id])
        for rule_id in vulnerability.affected_rules
        if rule_id in rules_by_id
    )
    payload = {"code": vulnerability.code, "rules": affected}
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def _finding(vulnerability: Vulnerability) -> dict:
    return {
        "id": vulnerability.id,
        "code": vulnerability.code,
        "severity": vulnerability.severity,
        "title": vulnerability.title,
        "affected_rules": vulnerability.affected_rules,
        "actions": vulnerability.actions,
        "resources": vulnerability.resources,
        "edge_type": vulnerability.edge_type,
    }


def _risk(result: AnalysisResult) -> int:
    raw = sum(SEVERITY_WEIGHT.get(item.severity, 0) for item in result.conflicts)
    return min(100, raw)


def _summary(result: AnalysisResult) -> dict:
    counts = {"critical": 0, "warning": 0, "info": 0}
    for finding in result.conflicts:
        key = finding.severity.lower()
        if key in counts:
            counts[key] += 1
    return {
        "rules": len(result.rules),
        "edges": len(result.edges),
        "findings": len(result.conflicts),
        "risk_score": _risk(result),
        **counts,
    }


def simulate_policy_change(current_text: str, proposed_text: str, policy_format: str) -> dict:
    current = build_and_analyze(_parse(current_text, policy_format), format=policy_format)
    proposed = build_and_analyze(_parse(proposed_text, policy_format), format=policy_format)

    current_rule_keys = {_rule_key(rule): rule for rule in current.rules}
    proposed_rule_keys = {_rule_key(rule): rule for rule in proposed.rules}
    current_rules_by_id = {rule.id: rule for rule in current.rules}
    proposed_rules_by_id = {rule.id: rule for rule in proposed.rules}
    current_findings = {
        _vulnerability_key(item, current_rules_by_id): item for item in current.conflicts
    }
    proposed_findings = {
        _vulnerability_key(item, proposed_rules_by_id): item for item in proposed.conflicts
    }

    introduced = [
        _finding(proposed_findings[key])
        for key in proposed_findings.keys() - current_findings.keys()
    ]
    resolved = [
        _finding(current_findings[key])
        for key in current_findings.keys() - proposed_findings.keys()
    ]
    introduced.sort(key=lambda item: (-SEVERITY_WEIGHT.get(item["severity"], 0), item["code"]))
    resolved.sort(key=lambda item: (-SEVERITY_WEIGHT.get(item["severity"], 0), item["code"]))

    current_summary = _summary(current)
    proposed_summary = _summary(proposed)
    delta = proposed_summary["risk_score"] - current_summary["risk_score"]
    verdict = "BLOCK" if any(item["severity"] == "CRITICAL" for item in introduced) else (
        "REVIEW" if introduced or delta > 0 else "PASS"
    )

    return {
        "format": policy_format,
        "verdict": verdict,
        "risk_delta": delta,
        "current": current_summary,
        "proposed": proposed_summary,
        "added_rules": [rule.model_dump() for key, rule in proposed_rule_keys.items() if key not in current_rule_keys],
        "removed_rules": [rule.model_dump() for key, rule in current_rule_keys.items() if key not in proposed_rule_keys],
        "introduced_findings": introduced,
        "resolved_findings": resolved,
        "attack_paths": [
            edge.model_dump()
            for edge in proposed.edges
            if edge.vulnerability_id in {item["id"] for item in introduced}
        ],
    }
