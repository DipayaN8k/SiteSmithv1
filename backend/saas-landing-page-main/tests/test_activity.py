import pytest
from sqlalchemy import select

from app.models.activity import ActivityLog
from app.services.activity import log_activity


def test_feed_is_newest_first_with_cursor_pagination(client, headers, make_lead):
    for i in range(5):
        make_lead(email=f"u{i}@example.com")

    first = client.get("/api/activity", headers=headers, params={"limit": 2}).json()
    assert len(first["items"]) == 2
    assert first["next_before"] == first["items"][-1]["id"]

    second = client.get(
        "/api/activity", headers=headers, params={"limit": 2, "before": first["next_before"]}
    ).json()
    assert max(i["id"] for i in second["items"]) < min(i["id"] for i in first["items"])

    last = client.get(
        "/api/activity", headers=headers, params={"limit": 2, "before": second["next_before"]}
    ).json()
    assert len(last["items"]) == 1
    assert last["next_before"] is None


def test_feed_filters_by_lead_and_user(client, headers, user, make_lead):
    a = make_lead(email="a@example.com")
    make_lead(email="b@example.com")
    client.patch(f"/api/leads/{a}/stages/backend", headers=headers, json={"status": "in_progress"})

    by_lead = client.get("/api/activity", headers=headers, params={"lead_id": a}).json()["items"]
    assert {i["lead_id"] for i in by_lead} == {a}

    by_user = client.get("/api/activity", headers=headers, params={"user_id": user.id}).json()["items"]
    assert [i["action"] for i in by_user] == ["stage_status_changed"]
    assert by_user[0]["user_name"] == "Soumava"


def test_system_actions_have_no_user(client, headers, make_lead):
    make_lead()
    item = client.get("/api/activity", headers=headers).json()["items"][0]
    assert item["action"] == "lead_created"
    assert item["user_id"] is None and item["user_name"] is None


def test_log_activity_rejects_unknown_action(db, make_lead):
    lead_id = make_lead()
    with pytest.raises(ValueError):
        log_activity(db, lead_id, None, "made_up", message="x")


def test_activity_log_is_append_only(db, make_lead):
    make_lead()
    row = db.scalars(select(ActivityLog)).first()
    row.message = "tampered"
    with pytest.raises(RuntimeError):
        db.flush()
    db.rollback()
    row = db.scalars(select(ActivityLog)).first()
    db.delete(row)
    with pytest.raises(RuntimeError):
        db.flush()
    db.rollback()


def test_logging_shares_the_callers_transaction(db, make_lead):
    lead_id = make_lead()
    before = len(db.scalars(select(ActivityLog)).all())
    log_activity(db, lead_id, None, "lead_created", message="x")
    db.rollback()
    assert len(db.scalars(select(ActivityLog)).all()) == before
