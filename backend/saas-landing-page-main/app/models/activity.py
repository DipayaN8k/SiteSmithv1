from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, event, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow
from app.models.user import User


class ActivityLog(Base):
    """Append-only. user_id NULL means a system/public action (e.g. the contact form)."""

    __tablename__ = "activity_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(50))
    stage: Mapped[str | None] = mapped_column(String(20))
    old_value: Mapped[str | None] = mapped_column(String(255))
    new_value: Mapped[str | None] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), index=True
    )

    user: Mapped[User | None] = relationship()


@event.listens_for(ActivityLog, "before_update")
@event.listens_for(ActivityLog, "before_delete")
def _forbid_changes(*_args) -> None:
    raise RuntimeError("activity_log is append-only")
