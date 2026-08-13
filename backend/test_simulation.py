import json

from backend.simulation import simulate_policy_change


def _iam(statement: dict) -> str:
    return json.dumps({"Version": "2012-10-17", "Statement": [statement]})


def test_wildcard_change_is_blocked():
    current = _iam({"Effect": "Allow", "Action": "s3:GetObject", "Resource": "arn:aws:s3:::prod/*"})
    proposed = _iam({"Effect": "Allow", "Action": "*", "Resource": "*"})

    result = simulate_policy_change(current, proposed, "iam")

    assert result["verdict"] == "BLOCK"
    assert result["risk_delta"] > 0
    assert any(item["severity"] == "CRITICAL" for item in result["introduced_findings"])


def test_safer_change_resolves_findings():
    current = _iam({"Effect": "Allow", "Action": "*", "Resource": "*"})
    proposed = _iam({"Effect": "Allow", "Action": "s3:GetObject", "Resource": "arn:aws:s3:::prod/*"})

    result = simulate_policy_change(current, proposed, "iam")

    assert result["verdict"] == "PASS"
    assert result["risk_delta"] < 0
    assert result["resolved_findings"]
