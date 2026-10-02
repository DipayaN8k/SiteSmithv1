from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.lead import CommentIn, CommentOut
from app.services import leads as svc

router = APIRouter(prefix="/api/leads", tags=["comments"])


@router.post("/{lead_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(
    lead_id: int,
    payload: CommentIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = svc.get_lead(db, lead_id)
    comment = svc.add_comment(db, lead, user, payload)
    db.commit()
    return svc.comment_to_out(comment)
