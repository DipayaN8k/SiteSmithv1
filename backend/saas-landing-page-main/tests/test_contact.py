from sqlalchemy import func, select

from app.models.activity import ActivityLog
from app.models.lead import Lead, LeadStage
from tests.conftest import contact_payload


def test_creates_lead_three_pending_stages_and_activity(client, db):
    resp = client.post("/api/contact", json=contact_payload())
    assert resp.status_code == 201

    lead = db.scalars(select(Lead)).one()
    assert lead.email == "asha@example.com"
    assert lead.consent is True
    stages = db.scalars(select(LeadStage).order_by(LeadStage.id)).all()
    assert [(s.stage, s.status) for s in stages] == [
        ("backend", "pending"),
        ("frontend", "pending"),
        ("deployment", "pending"),
    ]
    log = db.scalars(select(ActivityLog)).one()
    assert (log.action, log.user_id, log.lead_id) == ("lead_created", None, lead.id)
    assert "Asha Rao" in log.message


def test_other_requires_detail(client):
    resp = client.post("/api/contact", json=contact_payload(business_type="Other"))
    assert resp.status_code == 422
    resp = client.post(
        "/api/contact",
        json=contact_payload(business_type="Other", business_type_other="x" * 201),
    )
    assert resp.status_code == 422


def test_other_detail_stored_and_ignored_otherwise(client, db):
    client.post(
        "/api/contact",
        json=contact_payload(business_type="Other", business_type_other="Pet grooming"),
    )
    client.post(
        "/api/contact",
        json=contact_payload(email="b@example.com", business_type_other="ignored"),
    )
    other, retail = db.scalars(select(Lead).order_by(Lead.id)).all()
    assert other.business_type_other == "Pet grooming"
    assert retail.business_type_other is None


def test_rejects_unknown_business_type_bad_email_and_no_consent(client):
    assert client.post("/api/contact", json=contact_payload(business_type="Mining")).status_code == 422
    assert client.post("/api/contact", json=contact_payload(email="nope")).status_code == 422
    assert client.post("/api/contact", json=contact_payload(consent=False)).status_code == 422


def test_html_is_stripped(client, db):
    client.post(
        "/api/contact",
        json=contact_payload(full_name="<script>alert(1)</script>Asha <b>Rao</b>"),
    )
    assert db.scalars(select(Lead)).one().full_name == "alert(1)Asha Rao"


def test_honeypot_fakes_success_and_stores_nothing(client, db):
    resp = client.post("/api/contact", json=contact_payload(website="http://spam.example"))
    assert resp.status_code == 201
    assert db.scalar(select(func.count()).select_from(Lead)) == 0
    assert db.scalar(select(func.count()).select_from(ActivityLog)) == 0


def test_duplicate_email_is_flagged_not_blocked(client, user, headers):
    assert client.post("/api/contact", json=contact_payload()).status_code == 201
    assert client.post("/api/contact", json=contact_payload()).status_code == 201
    items = client.get("/api/leads", headers=headers).json()["items"]
    assert len(items) == 2
    assert all(i["duplicate_email"] for i in items)
