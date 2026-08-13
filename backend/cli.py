"""VEKTRA command-line interface.

Usage examples:
    python -m backend.cli doctor
    python -m backend.cli health --api https://vektra-six.vercel.app
    python -m backend.cli analyze policy.json --format iam --json
    python -m backend.cli workflow policy.yaml --format k8s --wait
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import sys
import time
from pathlib import Path
from typing import Any

import httpx

VERSION = "1.0.0"
DEFAULT_API = os.getenv("VEKTRA_API_URL", "http://localhost:8000").rstrip("/")


class CliError(RuntimeError):
    """Expected command failure with a user-readable message."""


def _endpoint(api: str, path: str) -> str:
    return f"{api.rstrip('/')}/api/{path.lstrip('/')}"


def _headers(args: argparse.Namespace) -> dict[str, str]:
    token = getattr(args, "token", None) or os.getenv("VEKTRA_TOKEN")
    return {"Authorization": f"Bearer {token}"} if token else {}


def _request(method: str, url: str, args: argparse.Namespace, **kwargs: Any) -> Any:
    try:
        response = httpx.request(method, url, headers=_headers(args), timeout=args.timeout, **kwargs)
    except httpx.RequestError as exc:
        raise CliError(f"Cannot reach VEKTRA API: {exc}") from exc
    if response.status_code >= 400:
        try:
            detail = response.json().get("detail", response.text)
        except ValueError:
            detail = response.text
        raise CliError(f"API returned {response.status_code}: {detail}")
    try:
        return response.json()
    except ValueError as exc:
        raise CliError("API returned an invalid JSON response.") from exc


def _print(data: Any, as_json: bool = False) -> None:
    if as_json:
        print(json.dumps(data, indent=2, sort_keys=True))
        return
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, (dict, list)):
                print(f"{key}: {json.dumps(value, ensure_ascii=False)}")
            else:
                print(f"{key}: {value}")
    else:
        print(data)


def cmd_doctor(args: argparse.Namespace) -> int:
    checks = {
        "cli_version": VERSION,
        "python": platform.python_version(),
        "api": args.api,
        "neo4j_configured": all(os.getenv(k) for k in ("NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD")),
        "sarvam_configured": bool(os.getenv("SARVAM_API_KEY")),
        "jwt_configured": len(os.getenv("JWT_SECRET", "")) >= 32,
    }
    if args.remote:
        try:
            checks["remote"] = _request("GET", _endpoint(args.api, "health"), args)
        except CliError as exc:
            checks["remote"] = {"status": "unavailable", "detail": str(exc)}
    _print(checks, args.json)
    return 0 if checks.get("remote", {}).get("status", "ok") == "ok" else 2


def cmd_health(args: argparse.Namespace) -> int:
    result = _request("GET", _endpoint(args.api, "health"), args)
    _print(result, args.json)
    return 0 if result.get("status") == "ok" else 2


def _policy(path: str) -> str:
    file = Path(path)
    if not file.is_file():
        raise CliError(f"Policy file not found: {file}")
    if file.stat().st_size > 500_000:
        raise CliError("Policy exceeds the 500 KB API limit.")
    return file.read_text(encoding="utf-8")


def cmd_analyze(args: argparse.Namespace) -> int:
    result = _request("POST", _endpoint(args.api, "analyze"), args, json={"policy_text": _policy(args.file), "format": args.format})
    _print(result, args.json)
    score = int((result.get("stats") or {}).get("risk_score", result.get("risk_score", 0)) or 0)
    return 3 if args.fail_above is not None and score >= args.fail_above else 0


def cmd_workflow(args: argparse.Namespace) -> int:
    result = _request("POST", _endpoint(args.api, "workflow/analyze"), args, json={"policy_text": _policy(args.file), "format": args.format})
    session = result.get("session_id")
    if not args.wait or not session:
        _print(result, args.json)
        return 0
    deadline = time.monotonic() + args.wait_timeout
    while time.monotonic() < deadline:
        status = _request("GET", _endpoint(args.api, f"workflow/status/{session}"), args)
        if status.get("status") in {"complete", "completed", "failed", "error"}:
            _print(status, args.json)
            return 0 if status.get("status") in {"complete", "completed"} else 4
        if not args.json:
            print(f"[{status.get('status', 'running')}] {status.get('progress', 0)}%", file=sys.stderr)
        time.sleep(args.poll_interval)
    raise CliError(f"Workflow {session} did not finish within {args.wait_timeout}s.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="vektra", description="VEKTRA security intelligence CLI")
    parser.add_argument("--version", action="version", version=f"%(prog)s {VERSION}")
    parser.add_argument("--api", default=DEFAULT_API, help=f"API base URL (default: {DEFAULT_API})")
    parser.add_argument("--token", help="Bearer token; prefer VEKTRA_TOKEN")
    parser.add_argument("--timeout", type=float, default=30.0, help="HTTP timeout in seconds")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON")
    commands = parser.add_subparsers(dest="command", required=True)

    doctor = commands.add_parser("doctor", help="Check local configuration and optional API connectivity")
    doctor.add_argument("--remote", action="store_true", help="Include a remote health check")
    doctor.set_defaults(handler=cmd_doctor)
    health = commands.add_parser("health", help="Check the deployed API")
    health.set_defaults(handler=cmd_health)

    for name, handler in (("analyze", cmd_analyze), ("workflow", cmd_workflow)):
        command = commands.add_parser(name, help=f"{name.title()} an IAM or Kubernetes policy")
        command.add_argument("file")
        command.add_argument("--format", choices=("iam", "k8s"), required=True)
        command.set_defaults(handler=handler)
        if name == "analyze":
            command.add_argument("--fail-above", type=int, choices=range(0, 101), metavar="SCORE", help="Exit 3 when risk meets this threshold")
        else:
            command.add_argument("--wait", action="store_true")
            command.add_argument("--wait-timeout", type=int, default=300)
            command.add_argument("--poll-interval", type=float, default=2.0)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.handler(args)
    except (CliError, UnicodeDecodeError) as exc:
        print(f"vektra: error: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("vektra: interrupted", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
