from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.lead import LeadDetail, LeadList, LeadUpdate, MutationOut, StageUpdate
from app.services import leads as svc

router = APIRouter(prefix="/api/leads", tags=["leads"], dependencies=[Depends(get_current_user)])


def _mutation_response(db: Session, lead_id: int) -> MutationOut:
    lead = svc.get_lead(db, lead_id)
    return MutationOut(
        lead=svc.summarize(db, lead),
        warnings=svc.stage_warnings({s.stage: s.status for s in lead.stages}),
    )


@router.get("", response_model=LeadList)
def list_leads(
    status: Literal["pending", "in_progress", "completed"] | None = None,
    q: str | None = Query(default=None, max_length=200),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items, total = svc.list_leads(db, status=status, q=q, page=page, page_size=page_size)
    return LeadList(items=items, total=total, page=page, page_size=page_size)


@router.get("/{lead_id}", response_model=LeadDetail)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    return svc.lead_detail(db, lead_id)


@router.patch("/{lead_id}", response_model=MutationOut)
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = svc.get_lead(db, lead_id)
    svc.assign_lead(db, lead, user, payload.assigned_to)
    db.commit()
    return _mutation_response(db, lead_id)


@router.delete("/{lead_id}", status_code=204)
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    svc.delete_lead(db, svc.get_lead(db, lead_id))
    db.commit()


@router.patch("/{lead_id}/stages/{stage}",response_model=MutationOut)
def update_stage(
    lead_id: int,
    stage: str,
    payload: StageUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = svc.get_lead(db, lead_id)
    svc.update_stage(
        db,
        lead,
        stage,
        user,
        status=payload.status,
        set_assignee="assigned_to" in payload.model_fields_set,
        assigned_to=payload.assigned_to,
    )
    db.commit()
    return _mutation_response(db, lead_id)
