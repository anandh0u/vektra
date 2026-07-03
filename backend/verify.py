import os
import sys
from pathlib import Path


sys.path.append(str(Path(__file__).parent.parent))

from backend.graph.analyzer import build_and_analyze
from backend.parser.iam_parser import parse_iam_policy
from backend.parser.k8s_parser import parse_k8s_rbac


def _load_sample(name: str) -> str:
    return (Path(__file__).parent / "samples" / name).read_text(encoding="utf-8")


def _codes(result):
    return {vulnerability.code for vulnerability in result.conflicts}


def test_iam_analysis():
    print("Testing IAM parser and VEKTRA graph analyzer...")
    rules = parse_iam_policy(_load_sample("sample_iam.json"))
    result = build_and_analyze(rules, format="iam")
    codes = _codes(result)
    print(f"  Parsed {len(rules)} IAM rules.")
    print(f"  Detected {len(result.conflicts)} IAM vulnerabilities: {sorted(codes)}")

    expected = {"V01", "V02", "V03", "V04", "V07", "V08", "V09", "V12"}
    missing = expected - codes
    assert not missing, f"Missing IAM vulnerability classes: {sorted(missing)}"
    assert any(edge.type == "GRANTS_ADMIN" for edge in result.edges), "Expected a GRANTS_ADMIN edge"
    assert any(rule.severity == "CRITICAL" for rule in result.rules), "Expected at least one critical rule"
    print("[PASS] IAM analysis passed.\n")


def test_k8s_analysis():
    print("Testing Kubernetes RBAC parser and VEKTRA graph analyzer...")
    rules = parse_k8s_rbac(_load_sample("sample_k8s.yaml"))
    result = build_and_analyze(rules, format="k8s")
    codes = _codes(result)
    print(f"  Parsed {len(rules)} Kubernetes RBAC rules.")
    print(f"  Detected {len(result.conflicts)} Kubernetes vulnerabilities: {sorted(codes)}")

    expected = {"V06", "V07", "V11", "V14"}
    missing = expected - codes
    assert not missing, f"Missing Kubernetes vulnerability classes: {sorted(missing)}"
    assert any(edge.type == "BYPASSES" for edge in result.edges), "Expected a BYPASSES edge"
    print("[PASS] Kubernetes analysis passed.\n")


def test_trust_chain_analysis():
    print("Testing IAM trust policy chain analysis...")
    policy_text = """
[
  {
    "RoleName": "AppRole",
    "AccountId": "111122223333",
    "PolicyDocument": {
      "Statement": [{
        "Sid": "AssumeBuildRole",
        "Effect": "Allow",
        "Action": "sts:AssumeRole",
        "Resource": "arn:aws:iam::111122223333:role/BuildRole"
      }]
    }
  },
  {
    "RoleName": "BuildRole",
    "AccountId": "111122223333",
    "AssumeRolePolicyDocument": {
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"AWS": "arn:aws:iam::999988887777:root"},
        "Action": "sts:AssumeRole"
      }]
    },
    "PolicyDocument": {
      "Statement": [{
        "Sid": "Admin",
        "Effect": "Allow",
        "Action": "*",
        "Resource": "*"
      }]
    }
  }
]
"""
    rules = parse_iam_policy(policy_text)
    result = build_and_analyze(rules, format="iam")
    codes = _codes(result)
    print(f"  Detected trust-chain vulnerabilities: {sorted(codes)}")
    assert "V05" in codes, "Expected assume-role chain escalation"
    assert "V10" in codes, "Expected cross-account trust"
    print("[PASS] Trust chain analysis passed.\n")


def test_unused_deny_analysis():
    print("Testing unused deny detection...")
    policy_text = """
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "UnusedDeny",
    "Effect": "Deny",
    "Action": "dynamodb:DeleteTable",
    "Resource": "arn:aws:dynamodb:us-east-1:111122223333:table/archive"
  }]
}
"""
    rules = parse_iam_policy(policy_text)
    result = build_and_analyze(rules, format="iam")
    codes = _codes(result)
    assert "V13" in codes, "Expected unused deny"
    print("[PASS] Unused deny analysis passed.\n")


if __name__ == "__main__":
    try:
        test_iam_analysis()
        test_k8s_analysis()
        test_trust_chain_analysis()
        test_unused_deny_analysis()
        print("ALL VEKTRA VERIFICATIONS PASSED")
    except AssertionError as exc:
        print(f"VERIFICATION FAILED: {exc}")
        sys.exit(1)
    except Exception as exc:
        print(f"UNEXPECTED ERROR: {exc}")
        sys.exit(1)
