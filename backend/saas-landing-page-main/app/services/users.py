from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ServiceError
from app.core.logging import audit_logger
from app.core.sanitize import strip_html
from app.core.security import hash_password, validate_password_strength
from app.models.user import User


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == normalize_email(email)))


def _require(db: Session, email: str) -> User:
    user = get_by_email(db, email)
    if user is None:
        raise ServiceError(404, f"No user with email {normalize_email(email)}")
    return user


def create_user(db: Session, name: str, email: str, password: str) -> User:
    name = strip_html(name)
    email = normalize_email(email)
    if not name:
        raise ServiceError(422, "Name is required")
    if "@" not in email or len(email) > 254:
        raise ServiceError(422, "A valid email is required")
    validate_password_strength(password)
    if get_by_email(db, email):
        raise ServiceError(409, f"A user with email {email} already exists")
    user = User(name=name, email=email, password_hash=hash_password(password))
    db.add(user)
    db.flush()
    audit_logger.info("user_created email=%s id=%s", email, user.id)
    return user


def reset_password(db: Session, email: str, password: str) -> User:
    user = _require(db, email)
    validate_password_strength(password)
    user.password_hash = hash_password(password)
    audit_logger.info("password_reset email=%s id=%s", user.email, user.id)
    return user


def deactivate_user(db: Session, email: str) -> User:
    user = _require(db, email)
    user.is_active = False
    audit_logger.info("user_deactivated email=%s id=%s", user.email, user.id)
    return user


def list_users(db: Session) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)))
