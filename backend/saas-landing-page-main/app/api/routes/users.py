from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.services import users

router = APIRouter(prefix="/api/users", tags=["users"], dependencies=[Depends(get_current_user)])


class TeamMember(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


@router.get("", response_model=list[TeamMember])
def list_team_members(db: Session = Depends(get_db)):
    """Active team members, for assignee dropdowns. Names only; no emails."""
    return [u for u in users.list_users(db) if u.is_active]
