from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.lead import ActivityPage
from app.services import leads as svc

router = APIRouter(
    prefix="/api/activity", tags=["activity"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=ActivityPage)
def activity(
    lead_id: int | None = None,
    user_id: int | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    before: int | None = Query(default=None, ge=1, description="Return entries older than this id"),
    db: Session = Depends(get_db),
):
    items, next_before = svc.activity_feed(
        db, lead_id=lead_id, user_id=user_id, limit=limit, before=before
    )
    return ActivityPage(items=items, next_before=next_before)
