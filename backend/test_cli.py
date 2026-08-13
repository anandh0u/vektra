import json

from backend import cli


def test_doctor_json(capsys):
    assert cli.main(["--json", "doctor"]) == 0
    output = json.loads(capsys.readouterr().out)
    assert output["cli_version"] == cli.VERSION


def test_missing_policy_is_safe(capsys):
    code = cli.main(["analyze", "does-not-exist.json", "--format", "iam"])
    assert code == 2
    assert "Policy file not found" in capsys.readouterr().err


def test_endpoint_normalizes_slashes():
    assert cli._endpoint("https://example.com/", "/health") == "https://example.com/api/health"
