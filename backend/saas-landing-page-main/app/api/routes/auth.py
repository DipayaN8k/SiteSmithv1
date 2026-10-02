from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.errors import ServiceError
from app.core.limiter import limiter
from app.core.logging import audit_logger
from app.core.security import (
    burn_password_check,
    create_access_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import ChangePasswordIn, LoginIn, TokenOut, UserOut
from app.services.users import get_by_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
@limiter.limit(settings.login_rate_limit)
def login(request: Request, payload: LoginIn, db: Session = Depends(get_db)):
    user = get_by_email(db, payload.email)
    if user is None:
        burn_password_check(payload.password)
    if (
        user is None
        or not verify_password(payload.password, user.password_hash)
        or not user.is_active
    ):
        raise HTTPException(401, "Invalid email or password")
    return TokenOut(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/change-password", status_code=204)
def change_password(
    payload: ChangePasswordIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    if payload.new_password == payload.current_password:
        raise ServiceError(422, "New password must differ from the current one")
    validate_password_strength(payload.new_password)
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    audit_logger.info("password_changed email=%s id=%s", user.email, user.id)
