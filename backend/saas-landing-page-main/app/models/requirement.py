from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, false, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow
from app.models.user import User


class Requirement(Base):
    """One client requirement for a stage (backend / frontend / deployment), ticked off when met."""

    __tablename__ = "requirements"
    __table_args__ = (Index("ix_requirements_lead_id", "lead_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id"))
    stage: Mapped[str] = mapped_column(String(20))
    text: Mapped[str] = mapped_column(Text)
    done: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    done_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )

    author: Mapped[User] = relationship(foreign_keys=[created_by])
    closer: Mapped[User | None] = relationship(foreign_keys=[done_by])
