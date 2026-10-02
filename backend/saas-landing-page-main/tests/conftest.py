import os

# Must be set before the app is imported. Overrides any real .env / shell values.
os.environ.update(
    ENV="dev",
    DATABASE_URL="sqlite://",
    JWT_SECRET="test-secret-test-secret-test-secret-123456",
    RATE_LIMIT_ENABLED="false",
    CORS_ORIGINS="http://landing.test,http://admin.test",
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.security import create_access_token  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services import users  # noqa: E402

PASSWORD = "correct-horse-battery"


@pytest.fixture(autouse=True)
def _tables():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def make_user(db):
    def _make(name="Soumava", email="soumava@company.com", password=PASSWORD):
        user = users.create_user(db, name, email, password)
        db.commit()
        return user

    return _make


@pytest.fixture
def user(make_user):
    return make_user()


def auth_headers(user) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


@pytest.fixture
def headers(user):
    return auth_headers(user)


def contact_payload(**overrides) -> dict:
    payload = {
        "full_name": "Asha Rao",
        "email": "asha@example.com",
        "phone": "+91 98765 43210",
        "business_type": "Retail",
        "consent": True,
    }
    payload.update(overrides)
    return payload


@pytest.fixture
def make_lead(client):
    """Submit the public form and return the new lead's id (newest lead)."""

    def _make(**overrides) -> int:
        resp = client.post("/api/contact", json=contact_payload(**overrides))
        assert resp.status_code == 201, resp.text
        from app.models.lead import Lead

        with SessionLocal() as s:
            return s.query(Lead).order_by(Lead.id.desc()).first().id

    return _make
