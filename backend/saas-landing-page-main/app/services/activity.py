from sqlalchemy.orm import Session

from app.core.constants import ACTIONS
from app.models.activity import ActivityLog


def log_activity(
    session: Session,
    lead_id: int,
    user_id: int | None,
    action: str,
    stage: str | None = None,
    old: str | None = None,
    new: str | None = None,
    *,
    message: str,
) -> ActivityLog:
    """The only way activity rows are written.

    Adds the row to the caller's session without committing, so it lands in the same
    transaction as the change it describes. user_id=None marks a system/public action.
    """
    if action not in ACTIONS:
        raise ValueError(f"Unknown activity action: {action}")
    entry = ActivityLog(
        lead_id=lead_id,
        user_id=user_id,
        action=action,
        stage=stage,
        old_value=old,
        new_value=new,
        message=message[:500],
    )
    session.add(entry)
    session.flush()
    return entry
