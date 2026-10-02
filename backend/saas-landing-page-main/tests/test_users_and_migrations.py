from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from app.core.errors import ServiceError
from app.core.security import verify_password
from app.services import users

ROOT = Path(__file__).resolve().parent.parent


def test_create_user_hashes_password_and_normalizes_email(db):
    user = users.create_user(db, "Priya", " Priya@Company.COM ", "twelve-chars-ok")
    db.commit()
    assert user.email == "priya@company.com"
    assert user.password_hash != "twelve-chars-ok"
    assert verify_password("twelve-chars-ok", user.password_hash)


def test_create_user_rules(db):
    with pytest.raises(ServiceError):
        users.create_user(db, "P", "p@company.com", "short")
    users.create_user(db, "P", "p@company.com", "twelve-chars-ok")
    with pytest.raises(ServiceError) as exc:
        users.create_user(db, "P2", "P@company.com", "twelve-chars-ok")
    assert exc.value.status_code == 409


def test_reset_and_deactivate_never_delete(db):
    users.create_user(db, "P", "p@company.com", "twelve-chars-ok")
    users.reset_password(db, "p@company.com", "another-long-password")
    user = users.deactivate_user(db, "p@company.com")
    db.commit()
    assert verify_password("another-long-password", user.password_hash)
    assert user.is_active is False
    assert [u.email for u in users.list_users(db)] == ["p@company.com"]
    with pytest.raises(ServiceError):
        users.deactivate_user(db, "ghost@company.com")


def test_team_member_list_shows_only_active_names(client, headers, make_user, db):
    make_user("Priya", "priya@company.com")
    gone = make_user("Gone", "gone@company.com")
    users.deactivate_user(db, gone.email)
    db.commit()
    resp = client.get("/api/users", headers=headers)
    assert resp.status_code == 200
    assert sorted(m["name"] for m in resp.json()) == ["Priya", "Soumava"]
    assert all(set(m) == {"id", "name"} for m in resp.json())


def test_audit_lines_are_logged(db, caplog):
    with caplog.at_level("INFO", logger="app.audit"):
        users.create_user(db, "P", "p@company.com", "twelve-chars-ok")
        users.reset_password(db, "p@company.com", "another-long-password")
        users.deactivate_user(db, "p@company.com")
    text = caplog.text
    assert "user_created" in text and "password_reset" in text and "user_deactivated" in text
    assert "twelve-chars-ok" not in text


def test_migrations_run_clean_from_empty_db(tmp_path):
    url = f"sqlite:///{(tmp_path / 'fresh.db').as_posix()}"
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "head")

    inspector = inspect(create_engine(url))
    assert {"users", "leads", "lead_stages", "comments", "activity_log"} <= set(
        inspector.get_table_names()
    )
    index_names = {i["name"] for t in inspector.get_table_names() for i in inspector.get_indexes(t)}
    assert {
        "ix_leads_created_at",
        "ix_leads_email",
        "ix_lead_stages_lead_id",
        "ix_activity_log_lead_id",
        "ix_activity_log_created_at",
    } <= index_names

    command.downgrade(cfg, "base")
