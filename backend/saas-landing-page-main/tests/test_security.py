import pytest

from app.core.limiter import limiter
from app.main import app
from tests.conftest import contact_payload

# Public by design. Login has to be reachable without a token.
PUBLIC = {("POST", "/api/contact"), ("GET", "/health"), ("POST", "/auth/login")}

PATH_VALUES = {"lead_id": "1", "stage": "backend", "requirement_id": "1"}


def _all_endpoints() -> set[tuple[str, str]]:
    """Every (METHOD, path) the app serves, read from the OpenAPI schema."""
    schema = app.openapi()
    return {
        (method.upper(), path)
        for path, item in schema["paths"].items()
        for method in item
        if method.upper() in {"GET", "POST", "PATCH", "PUT", "DELETE"}
    }


def _protected_endpoints():
    for method, path in _all_endpoints():
        if (method, path) not in PUBLIC:
            yield method, path.format(**PATH_VALUES)


def test_there_are_protected_endpoints_to_check():
    assert len(list(_protected_endpoints())) >= 8


@pytest.mark.parametrize(("method", "path"), sorted(_protected_endpoints()))
def test_protected_endpoint_requires_token(client, method, path):
    assert client.request(method, path, json={}).status_code == 401
    bad = client.request(method, path, json={}, headers={"Authorization": "Bearer nope"})
    assert bad.status_code == 401


def test_public_endpoints_need_no_token(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.post("/api/contact", json=contact_payload()).status_code == 201


def test_no_signup_route_exists():
    paths = {path for _method, path in _all_endpoints()}
    assert not any("signup" in p or "register" in p for p in paths)
    assert PUBLIC <= _all_endpoints()  # the public list can't silently go stale


def test_security_headers(client):
    headers = client.get("/health").headers
    assert headers["x-content-type-options"] == "nosniff"
    assert "max-age" in headers["strict-transport-security"]


def test_cors_allows_only_configured_origins(client):
    def preflight(origin):
        return client.options(
            "/api/leads",
            headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
        )

    assert preflight("http://admin.test").headers["access-control-allow-origin"] == "http://admin.test"
    assert "access-control-allow-origin" not in preflight("http://evil.test").headers


@pytest.fixture
def rate_limits_on():
    limiter.enabled = True
    limiter.reset()
    yield
    limiter.enabled = False
    limiter.reset()


def test_contact_is_rate_limited(client, rate_limits_on):
    codes = [client.post("/api/contact", json=contact_payload()).status_code for _ in range(6)]
    assert codes == [201] * 5 + [429]


def test_login_is_rate_limited(client, rate_limits_on):
    body = {"email": "x@company.com", "password": "whatever-password"}
    codes = [client.post("/auth/login", json=body).status_code for _ in range(11)]
    assert codes[:10] == [401] * 10
    assert codes[10] == 429
