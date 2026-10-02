from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow
from app.models.user import User


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(254), index=True)
    phone: Mapped[str | None] = mapped_column(String(30))
    business_type: Mapped[str] = mapped_column(String(50))
    business_type_other: Mapped[str | None] = mapped_column(String(200))
    project_type: Mapped[str | None] = mapped_column(String(100))
    budget: Mapped[str | None] = mapped_column(String(100))
    message: Mapped[str | None] = mapped_column(Text)
    assigned_to: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    consent: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now()
    )

    assignee: Mapped[User | None] = relationship(foreign_keys=[assigned_to])
    stages: Mapped[list["LeadStage"]] = relationship(
        back_populates="lead", order_by="LeadStage.id", cascade="all, delete-orphan"
    )


class LeadStage(Base):
    __tablename__ = "lead_stages"
    __table_args__ = (
        UniqueConstraint("lead_id", "stage", name="uq_lead_stages_lead_id_stage"),
        Index("ix_lead_stages_lead_id", "lead_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id"))
    stage: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending")
    assigned_to: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now()
    )

    lead: Mapped[Lead] = relationship(back_populates="stages")
    assignee: Mapped[User | None] = relationship(foreign_keys=[assigned_to])
