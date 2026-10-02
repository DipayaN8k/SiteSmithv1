from collections.abc import Iterable

from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.constants import (
    COMMENT_ADDED,
    LEAD_ASSIGNED,
    LEAD_CREATED,
    REQUIREMENT_ADDED,
    REQUIREMENT_TOGGLED,
    STAGE_ASSIGNED,
    STAGE_STATUS_CHANGED,
    STAGES,
)
from app.core.errors import ServiceError
from app.db.base import utcnow
from app.models.activity import ActivityLog
from app.models.comment import Comment
from app.models.lead import Lead, LeadStage
from app.models.requirement import Requirement
from app.models.user import User
from app.schemas.contact import ContactIn
from app.schemas.lead import (
    ActivityOut,
    CommentIn,
    CommentOut,
    LeadDetail,
    LeadSummary,
    RequirementIn,
    RequirementOut,
    RequirementUpdate,
    StageOut,
)
from app.services.activity import log_activity

# ---------- pure helpers ----------


def derive_status(statuses: Iterable[str]) -> str:
    """Overall status is computed from the stages and never stored."""
    s = list(statuses)
    if not s or all(x == "pending" for x in s):
        return "pending"
    if all(x == "completed" for x in s):
        return "completed"
    return "in_progress"


def stage_warnings(stage_statuses: dict[str, str]) -> list[str]:
    """Out-of-order progress is allowed but reported."""
    warnings: list[str] = []
    for i, stage in enumerate(STAGES):
        status = stage_statuses.get(stage)
        if status not in ("in_progress", "completed"):
            continue
        for earlier in STAGES[:i]:
            if stage_statuses.get(earlier) != "completed":
                if status == "completed":
                    warnings.append(f"{stage} completed before {earlier}")
                else:
                    warnings.append(f"{stage} in progress before {earlier} completed")
    return warnings


def _title(stage: str) -> str:
    return stage.capitalize()


def _label(status: str) -> str:
    return status.replace("_", " ")


# ---------- loading / serialising ----------

_LEAD_LOAD = (
    selectinload(Lead.stages).joinedload(LeadStage.assignee),
    joinedload(Lead.assignee),
)


def get_lead(db: Session, lead_id: int) -> Lead:
    lead = db.scalar(select(Lead).where(Lead.id == lead_id).options(*_LEAD_LOAD))
    if lead is None:
        raise ServiceError(404, "Lead not found")
    return lead


def duplicate_emails(db: Session, emails: Iterable[str]) -> set[str]:
    emails = set(emails)
    if not emails:
        return set()
    rows = db.scalars(
        select(Lead.email)
        .where(Lead.email.in_(emails))
        .group_by(Lead.email)
        .having(func.count() > 1)
    )
    return set(rows)


def to_summary(lead: Lead, duplicate: bool) -> LeadSummary:
    stages = sorted(lead.stages, key=lambda s: STAGES.index(s.stage))
    return LeadSummary(
        id=lead.id,
        full_name=lead.full_name,
        email=lead.email,
        phone=lead.phone,
        business_type=lead.business_type,
        business_type_other=lead.business_type_other,
        project_type=lead.project_type,
        budget=lead.budget,
        message=lead.message,
        assigned_to=lead.assigned_to,
        assigned_to_name=lead.assignee.name if lead.assignee else None,
        consent=lead.consent,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        status=derive_status(s.status for s in stages),
        duplicate_email=duplicate,
        stages=[
            StageOut(
                stage=s.stage,
                status=s.status,
                assigned_to=s.assigned_to,
                assigned_to_name=s.assignee.name if s.assignee else None,
                updated_at=s.updated_at,
            )
            for s in stages
        ],
    )


def summarize(db: Session, lead: Lead) -> LeadSummary:
    return to_summary(lead, lead.email in duplicate_emails(db, [lead.email]))


def activity_to_out(row: ActivityLog) -> ActivityOut:
    return ActivityOut(
        id=row.id,
        lead_id=row.lead_id,
        user_id=row.user_id,
        user_name=row.user.name if row.user else None,
        action=row.action,
        stage=row.stage,
        old_value=row.old_value,
        new_value=row.new_value,
        message=row.message,
        created_at=row.created_at,
    )


def comment_to_out(row: Comment) -> CommentOut:
    return CommentOut(
        id=row.id,
        lead_id=row.lead_id,
        stage=row.stage,
        user_id=row.user_id,
        user_name=row.user.name,
        body=row.body,
        created_at=row.created_at,
    )


def requirement_to_out(row: Requirement) -> RequirementOut:
    return RequirementOut(
        id=row.id,
        lead_id=row.lead_id,
        stage=row.stage,
        text=row.text,
        done=row.done,
        created_by_name=row.author.name,
        done_by_name=row.closer.name if row.closer else None,
        done_at=row.done_at,
        created_at=row.created_at,
    )


def get_requirement(db: Session, lead_id: int, requirement_id: int) -> Requirement:
    row = db.scalar(
        select(Requirement).where(
            Requirement.id == requirement_id, Requirement.lead_id == lead_id
        )
    )
    if row is None:
        raise ServiceError(404, "Requirement not found")
    return row


def lead_detail(db: Session, lead_id: int) -> LeadDetail:
    lead = get_lead(db, lead_id)
    summary = summarize(db, lead)
    comments = db.scalars(
        select(Comment)
        .where(Comment.lead_id == lead_id)
        .options(joinedload(Comment.user))
        .order_by(Comment.created_at, Comment.id)
    )
    activity = db.scalars(
        select(ActivityLog)
        .where(ActivityLog.lead_id == lead_id)
        .options(joinedload(ActivityLog.user))
        .order_by(ActivityLog.id.desc())
    )
    requirements = db.scalars(
        select(Requirement)
        .where(Requirement.lead_id == lead_id)
        .options(joinedload(Requirement.author), joinedload(Requirement.closer))
        .order_by(Requirement.id)
    )
    return LeadDetail(
        **summary.model_dump(),
        comments=[comment_to_out(c) for c in comments],
        activity=[activity_to_out(a) for a in activity],
        requirements=[requirement_to_out(r) for r in requirements],
    )


# ---------- queries ----------


def list_leads(
    db: Session, *, status: str | None, q: str | None, page: int, page_size: int
) -> tuple[list[LeadSummary], int]:
    """Search in SQL, derive status in Python (fine at this volume), then paginate."""
    stmt = select(Lead).options(*_LEAD_LOAD).order_by(Lead.created_at.desc(), Lead.id.desc())
    if q and q.strip():
        term = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        like = f"%{term}%"
        stmt = stmt.where(
            or_(Lead.full_name.ilike(like, escape="\\"), Lead.email.ilike(like, escape="\\"))
        )
    leads = list(db.scalars(stmt))
    if status:
        leads = [lead for lead in leads if derive_status(s.status for s in lead.stages) == status]
    total = len(leads)
    window = leads[(page - 1) * page_size : page * page_size]
    dupes = duplicate_emails(db, (lead.email for lead in window))
    return [to_summary(lead, lead.email in dupes) for lead in window], total


def activity_feed(
    db: Session,
    *,
    lead_id: int | None,
    user_id: int | None,
    limit: int,
    before: int | None,
) -> tuple[list[ActivityOut], int | None]:
    stmt = select(ActivityLog).options(joinedload(ActivityLog.user)).order_by(ActivityLog.id.desc())
    if lead_id is not None:
        stmt = stmt.where(ActivityLog.lead_id == lead_id)
    if user_id is not None:
        stmt = stmt.where(ActivityLog.user_id == user_id)
    if before is not None:
        stmt = stmt.where(ActivityLog.id < before)
    rows = list(db.scalars(stmt.limit(limit + 1)))
    has_more = len(rows) > limit
    rows = rows[:limit]
    return [activity_to_out(r) for r in rows], (rows[-1].id if has_more else None)


# ---------- mutations (callers commit once) ----------


def create_lead(db: Session, data: ContactIn) -> Lead:
    """Lead + 3 pending stages + lead_created activity, all in the caller's transaction."""
    email = data.email.lower()
    is_duplicate = bool(
        db.scalar(select(func.count()).select_from(Lead).where(Lead.email == email))
    )
    lead = Lead(
        full_name=data.full_name,
        email=email,
        phone=data.phone,
        business_type=data.business_type,
        business_type_other=data.business_type_other,
        project_type=data.project_type,
        budget=data.budget,
        message=data.message,
        consent=data.consent,
    )
    lead.stages = [LeadStage(stage=s, status="pending") for s in STAGES]
    db.add(lead)
    db.flush()
    kind = data.business_type_other if data.business_type == "Other" else data.business_type
    message = f"New request from {lead.full_name} ({kind})"
    if is_duplicate:
        message += " - this email has submitted before"
    log_activity(db, lead.id, None, LEAD_CREATED, message=message)
    return lead


def _resolve_assignee(db: Session, user_id: int | None) -> User | None:
    if user_id is None:
        return None
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise ServiceError(422, "assigned_to must be an active team member")
    return user


def assign_lead(db: Session, lead: Lead, actor: User, assigned_to: int | None) -> None:
    new = _resolve_assignee(db, assigned_to)
    old = lead.assignee
    if (old.id if old else None) == (new.id if new else None):
        return
    lead.assignee = new
    lead.updated_at = utcnow()
    if new:
        message = f"{actor.name} assigned the request to {new.name}"
    else:
        message = f"{actor.name} unassigned the request (was {old.name})"
    log_activity(
        db, lead.id, actor.id, LEAD_ASSIGNED,
        old=old.name if old else "Unassigned",
        new=new.name if new else "Unassigned",
        message=message,
    )  # fmt: skip


def update_stage(
    db: Session,
    lead: Lead,
    stage: str,
    actor: User,
    *,
    status: str | None,
    set_assignee: bool,
    assigned_to: int | None,
) -> None:
    if stage not in STAGES:
        raise ServiceError(404, "Unknown stage")
    row = next(s for s in lead.stages if s.stage == stage)
    changed = False

    if status is not None and status != row.status:
        old_status = row.status
        row.status = status
        changed = True
        log_activity(
            db, lead.id, actor.id, STAGE_STATUS_CHANGED, stage, old_status, status,
            message=f"{actor.name} moved {_title(stage)}: {_label(old_status)} → {_label(status)}",
        )  # fmt: skip

    if set_assignee:
        new = _resolve_assignee(db, assigned_to)
        old = row.assignee
        if (old.id if old else None) != (new.id if new else None):
            row.assignee = new
            changed = True
            if new:
                message = f"{actor.name} assigned {_title(stage)} to {new.name}"
            else:
                message = f"{actor.name} unassigned {_title(stage)} (was {old.name})"
            log_activity(
                db, lead.id, actor.id, STAGE_ASSIGNED, stage,
                old.name if old else "Unassigned",
                new.name if new else "Unassigned",
                message=message,
            )  # fmt: skip

    if changed:
        row.updated_at = utcnow()
        lead.updated_at = utcnow()


def delete_lead(db: Session, lead: Lead) -> None:
    """Hard delete: the lead, its stages, comments and activity history."""
    # activity_log is append-only at the ORM level (see models/activity.py); a Core
    # DELETE bypasses those guards, which is intended here: the whole record goes.
    db.execute(delete(ActivityLog).where(ActivityLog.lead_id == lead.id))
    db.execute(delete(Comment).where(Comment.lead_id == lead.id))
    db.execute(delete(Requirement).where(Requirement.lead_id == lead.id))
    db.delete(lead)  # stages go with it via the cascade


def add_requirement(db: Session, lead: Lead, actor: User, data: RequirementIn) -> Requirement:
    row = Requirement(lead_id=lead.id, stage=data.stage, text=data.text, created_by=actor.id)
    db.add(row)
    db.flush()
    lead.updated_at = utcnow()
    log_activity(
        db, lead.id, actor.id, REQUIREMENT_ADDED, data.stage,
        message=f"{actor.name} added a {_title(data.stage)} requirement",
    )  # fmt: skip
    return row


def update_requirement(db: Session, row: Requirement, actor: User, data: RequirementUpdate) -> None:
    if data.text is not None:
        row.text = data.text
    if data.done is not None and data.done != row.done:
        row.done = data.done
        row.done_by = actor.id if data.done else None
        row.done_at = utcnow() if data.done else None
        verb = "marked a requirement as met" if data.done else "reopened a requirement"
        log_activity(
            db, row.lead_id, actor.id, REQUIREMENT_TOGGLED, row.stage,
            "open" if data.done else "met", "met" if data.done else "open",
            message=f"{actor.name} {verb} on {_title(row.stage)}",
        )  # fmt: skip
    db.get(Lead, row.lead_id).updated_at = utcnow()


def add_comment(db: Session, lead: Lead, actor: User, data: CommentIn) -> Comment:
    if data.stage is not None and data.stage not in STAGES:
        raise ServiceError(422, f"stage must be one of: {', '.join(STAGES)}")
    comment = Comment(lead_id=lead.id, stage=data.stage, user_id=actor.id, body=data.body)
    db.add(comment)
    db.flush()
    where = f" on {_title(data.stage)}" if data.stage else ""
    log_activity(
        db, lead.id, actor.id, COMMENT_ADDED, data.stage,
        message=f"{actor.name} commented{where}",
    )  # fmt: skip
    return comment
