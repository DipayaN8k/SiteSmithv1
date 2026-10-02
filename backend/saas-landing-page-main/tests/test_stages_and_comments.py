from sqlalchemy import select

from app.models.activity import ActivityLog


def test_stage_status_change_logs_readable_message(client, headers, make_lead, db):
    lead_id = make_lead()
    resp = client.patch(
        f"/api/leads/{lead_id}/stages/backend", headers=headers, json={"status": "in_progress"}
    )
    assert resp.status_code == 200
    assert resp.json()["warnings"] == []
    log = db.scalars(select(ActivityLog).order_by(ActivityLog.id.desc())).first()
    assert log.action == "stage_status_changed"
    assert log.message == "Soumava moved Backend: pending → in progress"
    assert (log.stage, log.old_value, log.new_value) == ("backend", "pending", "in_progress")


def test_noop_change_logs_nothing(client, headers, make_lead, db):
    lead_id = make_lead()
    client.patch(f"/api/leads/{lead_id}/stages/backend", headers=headers, json={"status": "pending"})
    assert len(db.scalars(select(ActivityLog)).all()) == 1  # only lead_created


def test_out_of_order_completion_warns_but_is_allowed(client, headers, make_lead):
    lead_id = make_lead()
    resp = client.patch(
        f"/api/leads/{lead_id}/stages/deployment", headers=headers, json={"status": "completed"}
    )
    assert resp.status_code == 200
    warnings = resp.json()["warnings"]
    assert "deployment completed before backend" in warnings
    assert "deployment completed before frontend" in warnings


def test_invalid_stage_status_and_empty_body(client, headers, make_lead):
    lead_id = make_lead()
    url = f"/api/leads/{lead_id}/stages/backend"
    assert client.patch(url, headers=headers, json={"status": "done"}).status_code == 422
    assert client.patch(url, headers=headers, json={}).status_code == 422
    assert (
        client.patch(f"/api/leads/{lead_id}/stages/qa", headers=headers, json={"status": "pending"})
    ).status_code == 404


def test_assign_stage_and_unassign(client, headers, make_lead, make_user, user, db):
    lead_id = make_lead()
    other = make_user("Priya", "priya@company.com")
    url = f"/api/leads/{lead_id}/stages/frontend"
    resp = client.patch(url, headers=headers, json={"assigned_to": other.id})
    stage = next(s for s in resp.json()["lead"]["stages"] if s["stage"] == "frontend")
    assert stage["assigned_to_name"] == "Priya"
    log = db.scalars(select(ActivityLog).order_by(ActivityLog.id.desc())).first()
    assert (log.action, log.message) == ("stage_assigned", "Soumava assigned Frontend to Priya")

    resp = client.patch(url, headers=headers, json={"assigned_to": None})
    stage = next(s for s in resp.json()["lead"]["stages"] if s["stage"] == "frontend")
    assert stage["assigned_to"] is None


def test_assign_lead_validates_assignee(client, headers, make_lead, make_user, user, db):
    from app.services import users

    lead_id = make_lead()
    ghost = client.patch(f"/api/leads/{lead_id}", headers=headers, json={"assigned_to": 9999})
    assert ghost.status_code == 422

    other = make_user("Priya", "priya@company.com")
    ok = client.patch(f"/api/leads/{lead_id}", headers=headers, json={"assigned_to": other.id})
    assert ok.json()["lead"]["assigned_to_name"] == "Priya"
    log = db.scalars(select(ActivityLog).order_by(ActivityLog.id.desc())).first()
    assert (log.action, log.message) == ("lead_assigned", "Soumava assigned the request to Priya")

    users.deactivate_user(db, other.email)
    db.commit()
    inactive = client.patch(f"/api/leads/{lead_id}", headers=headers, json={"assigned_to": other.id})
    assert inactive.status_code == 422
    assert client.patch(f"/api/leads/{lead_id}", headers=headers, json={}).status_code == 422


def test_comments_general_and_stage(client, headers, make_lead):
    lead_id = make_lead()
    url = f"/api/leads/{lead_id}/comments"
    general = client.post(url, headers=headers, json={"body": "<i>Called them</i>"})
    assert general.status_code == 201
    assert general.json()["body"] == "Called them"
    assert general.json()["stage"] is None
    assert general.json()["user_name"] == "Soumava"

    staged = client.post(url, headers=headers, json={"body": "API done", "stage": "backend"})
    assert staged.json()["stage"] == "backend"

    assert client.post(url, headers=headers, json={"body": "x", "stage": "qa"}).status_code == 422
    assert client.post(url, headers=headers, json={"body": "   "}).status_code == 422
    assert client.post("/api/leads/999/comments", headers=headers, json={"body": "x"}).status_code == 404


def test_comment_activity_messages(client, headers, make_lead):
    lead_id = make_lead()
    client.post(f"/api/leads/{lead_id}/comments", headers=headers, json={"body": "a"})
    client.post(f"/api/leads/{lead_id}/comments", headers=headers, json={"body": "b", "stage": "backend"})
    feed = client.get("/api/activity", headers=headers, params={"lead_id": lead_id}).json()["items"]
    assert [i["message"] for i in feed[:2]] == [
        "Soumava commented on Backend",
        "Soumava commented",
    ]
