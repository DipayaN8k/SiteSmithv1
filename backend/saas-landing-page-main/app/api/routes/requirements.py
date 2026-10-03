from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.lead import RequirementIn, RequirementOut, RequirementUpdate
from app.services import leads as svc

router = APIRouter(
    prefix="/api/leads/{lead_id}/requirements",
    tags=["requirements"],
    dependencies=[Depends(get_current_user)],
)


@router.post("", response_model=RequirementOut, status_code=201)
def add_requirement(
    lead_id: int,
    payload: RequirementIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = svc.get_lead(db, lead_id)
    row = svc.add_requirement(db, lead, user, payload)
    db.commit()
    return svc.requirement_to_out(row)


@router.patch("/{requirement_id}", response_model=RequirementOut)
def update_requirement(
    lead_id: int,
    requirement_id: int,
    payload: RequirementUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = svc.get_requirement(db, lead_id, requirement_id)
    svc.update_requirement(db, row, user, payload)
    db.commit()
    return svc.requirement_to_out(row)


@router.delete("/{requirement_id}", status_code=204)
def delete_requirement(lead_id: int, requirement_id: int, db: Session = Depends(get_db)):
    db.delete(svc.get_requirement(db, lead_id, requirement_id))
    db.commit()
