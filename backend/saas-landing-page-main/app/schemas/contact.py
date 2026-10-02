import re
from typing import Self

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.core.constants import BUSINESS_TYPES
from app.core.sanitize import strip_html

_PHONE_RE = re.compile(r"^[0-9+\-() .]{5,30}$")


class ContactIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=30)
    business_type: str
    business_type_other: str | None = Field(default=None, max_length=200)
    consent: bool
    website: str | None = None  # honeypot: hidden in the form, real users leave it empty

    @field_validator("full_name", "phone", "business_type_other", mode="before")
    @classmethod
    def _clean(cls, v, info):
        if not isinstance(v, str):
            return v
        v = strip_html(v)
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
