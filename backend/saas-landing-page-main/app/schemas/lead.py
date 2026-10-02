from datetime import datetime
from typing import Self

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.constants import STAGE_STATUSES
from app.core.sanitize import strip_html


class StageOut(BaseModel):
    stage: str
    status: str
    assigned_to: int | None
    assigned_to_name: str | None
    updated_at: datetime


class LeadSummary(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str | None
    business_type: str
    business_type_other: str | None
    assigned_to: int | None
    assigned_to_name: str | None
    consent: bool
    created_at: datetime
    updated_at: datetime
    status: str  # derived from the stages, never stored
    duplicate_email: bool  # another lead already used this email
    stages: list[StageOut]


class CommentOut(BaseModel):
    id: int
    lead_id: int
    stage: str | None
    user_id: int
    user_name: str
    body: str
    created_at: datetime


class ActivityOut(BaseModel):
    id: int
    lead_id: int
    user_id: int | None
    user_name: str | None  # None = system / public action
    action: str
    stage: str | None
    old_value: str | None
    new_value: str | None
    message: str
    created_at: datetime


class LeadDetail(LeadSummary):
    comments: list[CommentOut]
    activity: list[ActivityOut]


class LeadList(BaseModel):
    items: list[LeadSummary]
    total: int
    page: int
    page_size: int


class ActivityPage(BaseModel):
    items: list[ActivityOut]
    next_before: int | None  # pass as ?before= to get the next (older) page


class LeadUpdate(BaseModel):
    assigned_to: int | None  # required; null unassigns


class StageUpdate(BaseModel):
    status: str | None = None
    assigned_to: int | None = None

    @field_validator("status")
    @classmethod
    def _check_status(cls, v: str | None) -> str | None:
        if v is not None and v not in STAGE_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(STAGE_STATUSES)}")
        return v

    @model_validator(mode="after")
    def _need_something(self) -> Self:
        if not self.model_fields_set & {"status", "assigned_to"}:
            raise ValueError("Provide status and/or assigned_to")
        if "status" in self.model_fields_set and self.status is None:
            raise ValueError("status cannot be null")
        return self


class MutationOut(BaseModel):
    lead: LeadSummary
    warnings: list[str]


class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    stage: str | None = None

    @field_validator("body", mode="before")
    @classmethod
    def _clean_body(cls, v):
        return strip_html(v, multiline=True) if isinstance(v, str) else v
