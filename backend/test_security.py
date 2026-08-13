import asyncio

import pytest
from fastapi import HTTPException
from fastapi import Response
from fastapi.testclient import TestClient
from starlette.requests import Request

from backend import auth, main


def _request(*, cookie: str = "", authorization: str = "") -> Request:
    headers = []
    if cookie:
        headers.append((b"cookie", cookie.encode()))
    if authorization:
        headers.append((b"authorization", authorization.encode()))
    return Request({"type": "http", "method": "GET", "path": "/", "headers": headers})


def test_http_only_cookie_token_is_accepted(monkeypatch):
    monkeypatch.setattr(auth, "JWT_SECRET", "test-secret-with-at-least-32-characters")
    token = auth.create_token("user-1", "person@example.com", "free", "version-1")

    claims = auth.get_current_user(_request(cookie=f"vektra_session={token}"))

    assert claims["user_id"] == "user-1"
    assert claims["sv"] == "version-1"


def test_session_cookie_is_http_only_and_secure():
    response = Response()
    request = Request({"type": "http", "method": "POST", "path": "/", "scheme": "https", "server": ("vektra.example", 443), "headers": []})

    main.set_session_cookie(response, request, "signed-token")

    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie
    assert "Secure" in cookie
    assert "SameSite=lax" in cookie


def test_rotated_session_version_is_rejected(monkeypatch):
    monkeypatch.setattr(auth, "JWT_SECRET", "test-secret-with-at-least-32-characters")
    token = auth.create_token("user-1", "person@example.com", "free", "old-version")

    async def ready(*args, **kwargs):
        return True

    async def get_user(_user_id):
        return {"id": "user-1", "jwt_secret": "new-version"}

    monkeypatch.setattr(main, "ensure_neo4j_ready", ready)
    monkeypatch.setattr(main.neo4j_client, "get_user_by_id", get_user)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(main.resolve_request_user(_request(cookie=f"vektra_session={token}"), required=True))
    assert exc.value.status_code == 401


def test_report_save_requires_session_ownership(monkeypatch):
    async def user(*args, **kwargs):
        return {"id": "user-1"}

    async def belongs(*args, **kwargs):
        return False

    monkeypatch.setattr(main, "resolve_request_user", user)
    monkeypatch.setattr(main.neo4j_client, "session_belongs_to_user", belongs)

    body = main.ReportSaveRequest(session_id="someone-elses-session", report_data={})
    with pytest.raises(HTTPException) as exc:
        asyncio.run(main.save_report_endpoint(body, _request()))
    assert exc.value.status_code == 404


def test_backend_security_headers(monkeypatch):
    async def unavailable(*args, **kwargs):
        return False

    monkeypatch.setattr(main, "ensure_neo4j_ready", unavailable)
    response = TestClient(main.app).get("/api/health")

    assert response.headers["strict-transport-security"].startswith("max-age=63072000")
    assert response.headers["x-content-type-options"] == "nosniff"
