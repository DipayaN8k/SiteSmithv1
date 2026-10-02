import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.limiter import limiter
from app.db.session import get_db
from app.schemas.contact import ContactIn, ContactOut
from app.services.leads import create_lead

router = APIRouter(prefix="/api", tags=["public"])
logger = logging.getLogger(__name__)


@router.post("/contact", response_model=ContactOut, status_code=201)
@limiter.limit(settings.contact_rate_limit)
def submit_contact(request: Request, payload: ContactIn, db: Session = Depends(get_db)):
    if payload.website:
        # Honeypot filled: pretend it worked, store nothing.
        logger.info("honeypot triggered; submission discarded")
        return ContactOut()
    create_lead(db, payload)
    db.commit()
    return ContactOut()
