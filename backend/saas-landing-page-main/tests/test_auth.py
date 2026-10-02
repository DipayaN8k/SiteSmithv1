from datetime import UTC, datetime, timedelta

import jwt

from app.core.config import settings
from app.services import users
from tests.conftest import PASSWORD, auth_headers


def login(client, email="soumava@company.com", password=PASSWORD):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_login_and_me(client, user):
    resp = login(client)
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "soumava@company.com"
    assert "password_hash" not in me.json()


def test_login_email_is_case_insensitive(client, user):
    assert login(client, email="SOUMAVA@Company.com").status_code == 200


def test_bad_credentials_get_same_401(client, user):
    wrong_pw = login(client, password="wrong-password-123")
    unknown = login(client, email="nobody@company.com")
    assert wrong_pw.status_code == unknown.status_code == 401
    assert wrong_pw.json() == unknown.json()


def test_inactive_user_cannot_login_and_token_stops_working(client, db, user):
    headers = auth_headers(user)
    assert client.get("/auth/me", headers=headers).status_code == 200
    users.deactivate_user(db, user.email)
    db.commit()
    assert login(client).status_code == 401
    assert client.get("/auth/me", headers=headers).status_code == 401


def test_expired_and_forged_tokens_rejected(client, user):
    def token(secret, exp):
        return jwt.encode(
            {"sub": str(user.id), "exp": exp}, secret, algorithm=settings.jwt_algorithm
        )

    expired = token(settings.jwt_secret, datetime.now(UTC) - timedelta(minutes=1))
    forged = token("some-other-secret-some-other-secret-12", datetime.now(UTC) + timedelta(hours=1))
    for t in (expired, forged, "garbage"):
        resp = client.get("/auth/me", headers={"Authorization": f"Bearer {t}"})
        assert resp.status_code == 401


def test_change_password(client, user, headers):
    new_pw = "a-brand-new-password"
    resp = client.post(
        "/auth/change-password",
        headers=headers,
        json={"current_password": PASSWORD, "new_password": new_pw},
    )
    assert resp.status_code == 204
    assert login(client, password=PASSWORD).status_code == 401
    assert login(client, password=new_pw).status_code == 200


def test_change_password_validations(client, user, headers):
    wrong = client.post(
        "/auth/change-password",
        headers=headers,
        json={"current_password": "nope-nope-nope-1", "new_password": "a-brand-new-password"},
    )
    assert wrong.status_code == 400
    short = client.post(
        "/auth/change-password",
        headers=headers,
        json={"current_password": PASSWORD, "new_password": "short"},
    )
    assert short.status_code == 422
