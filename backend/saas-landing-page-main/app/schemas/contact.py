import re
from typing import Self

from email_validator import EmailNotValidError, EmailUndeliverableError, validate_email
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.core.config import settings
from app.core.constants import BUSINESS_TYPES
from app.core.sanitize import strip_html

_PHONE_RE = re.compile(r"^[0-9+\-() .]{5,30}$")

# Typo domains that are real, registered and accept mail, so the DNS check can't catch them.
_TYPO_DOMAINS = {
    "gamil.com": "gmail.com", "gmial.com": "gmail.com", "gmai.com": "gmail.com",
    "gmail.con": "gmail.com", "gmail.co": "gmail.com", "gmal.com": "gmail.com",
    "gnail.com": "gmail.com", "gmaill.com": "gmail.com", "gmail.cm": "gmail.com",
    "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.con": "yahoo.com",
    "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "hotmail.con": "hotmail.com",
    "outlok.com": "outlook.com", "outlook.con": "outlook.com", "iclod.com": "icloud.com",
}  # fmt: skip


class ContactIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=30)
    business_type: str
    business_type_other: str | None = Field(default=None, max_length=200)
    project_type: str | None = Field(default=None, max_length=100)
    budget: str | None = Field(default=None, max_length=100)
    message: str | None = Field(default=None, max_length=2000)
    consent: bool
    website: str | None = None  # honeypot: hidden in the form, real users leave it empty

    @field_validator("email")
    @classmethod
    def _check_deliverable(cls, v: str) -> str:
        # Runs after EmailStr has accepted the syntax. Rejects domains that don't exist
        # or don't accept mail (me@gmial.con). A DNS outage must not block real leads,
        # so lookup failures are let through.
        domain = v.rsplit("@", 1)[-1].lower()
        if domain in _TYPO_DOMAINS:
            raise ValueError(f"Did you mean @{_TYPO_DOMAINS[domain]}? Check your email for typos.")
        if not settings.email_check_deliverability:
            return v
        try:
            validate_email(v, check_deliverability=True, timeout=5)
        except EmailUndeliverableError as exc:
            msg = str(exc).lower()
            if "error while checking" in msg or "timed out" in msg or "timeout" in msg:
                return v
            raise ValueError("That email domain can't receive mail. Check for typos.") from exc
        except EmailNotValidError:
            pass  # syntax already validated by EmailStr
        return v

    @field_validator(
        "full_name", "phone", "business_type_other", "project_type", "budget", "message",
        mode="before",
    )  # fmt: skip
    @classmethod
    def _clean(cls, v, info):
        if not isinstance(v, str):
            return v
        v = strip_html(v, multiline=info.field_name == "message")
        if v == "" and info.field_name != "full_name":
            return None  # optional fields: blank means "not provided"
        return v

    @field_validator("phone")
    @classmethod
    def _check_phone(cls, v: str | None) -> str | None:
        if v is not None and not _PHONE_RE.match(v):
            raise ValueError("Enter a valid phone number")
        return v

    @field_validator("business_type")
    @classmethod
    def _check_business_type(cls, v: str) -> str:
        if v not in BUSINESS_TYPES:
            raise ValueError(f"business_type must be one of: {', '.join(BUSINESS_TYPES)}")
        return v

    @field_validator("consent")
    @classmethod
    def _check_consent(cls, v: bool) -> bool:
        if v is not True:
            raise ValueError("Consent is required")
        return v

    @model_validator(mode="after")
    def _check_other(self) -> Self:
        if self.business_type == "Other":
            if not self.business_type_other:
                raise ValueError("business_type_other is required when business_type is Other")
        else:
            self.business_type_other = None
        return self


class ContactOut(BaseModel):
    message: str = "Thanks, your request has been received. Our team will get back to you."
