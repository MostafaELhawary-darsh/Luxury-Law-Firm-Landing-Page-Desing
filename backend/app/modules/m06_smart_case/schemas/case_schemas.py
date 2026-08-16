from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CaseCreateSchema(BaseModel):
    case_number: str = Field(..., max_length=255)
    title: str = Field(..., max_length=512)
    case_type: str = Field(..., max_length=64)
    court: str | None = Field(None, max_length=255)
    judge_name: str | None = Field(None, max_length=255)
    plaintiff: str
    defendant: str
    description: str | None = None
    assigned_lawyer_id: str = Field(..., max_length=36)
    client_id: str = Field(..., max_length=36)
    priority: str = Field("MEDIUM", max_length=32)


class CaseUpdateSchema(BaseModel):
    case_number: str | None = Field(None, max_length=255)
    title: str | None = Field(None, max_length=512)
    case_type: str | None = Field(None, max_length=64)
    status: str | None = Field(None, max_length=64)
    court: str | None = Field(None, max_length=255)
    judge_name: str | None = Field(None, max_length=255)
    plaintiff: str | None = None
    defendant: str | None = None
    description: str | None = None
    assigned_lawyer_id: str | None = Field(None, max_length=36)
    client_id: str | None = Field(None, max_length=36)
    opened_date: datetime | None = None
    closed_date: datetime | None = None
    next_hearing_date: datetime | None = None
    priority: str | None = Field(None, max_length=32)
    is_encrypted: bool | None = None
    metadata_: dict | None = None


class CaseResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_number: str
    title: str
    case_type: str
    status: str
    court: str | None = None
    judge_name: str | None = None
    plaintiff: str | None = None
    defendant: str | None = None
    description: str | None = None
    assigned_lawyer_id: str
    client_id: str
    opened_date: datetime
    closed_date: datetime | None = None
    next_hearing_date: datetime | None = None
    priority: str
    is_encrypted: bool
    metadata_: dict | None = None
    created_at: datetime
    updated_at: datetime


class HearingCreateSchema(BaseModel):
    hearing_date: datetime
    hearing_type: str = Field(..., max_length=64)
    location: str | None = Field(None, max_length=255)
    notes: str | None = None
    outcome: str | None = Field(None, max_length=255)
    is_completed: bool = False


class HearingResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID
    hearing_date: datetime
    hearing_type: str
    location: str | None = None
    notes: str | None = None
    outcome: str | None = None
    is_completed: bool
    created_at: datetime


class DocumentCreateSchema(BaseModel):
    document_type: str = Field(..., max_length=64)
    title: str = Field(..., max_length=512)
    file_path: str = Field(..., max_length=1024)
    uploaded_by: str = Field(..., max_length=36)
    is_encrypted: bool = False


class DocumentResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID
    document_type: str
    title: str
    file_path: str
    uploaded_by: str
    is_encrypted: bool
    created_at: datetime


class PartyCreateSchema(BaseModel):
    party_name: str
    party_role: str = Field(..., max_length=64)
    contact_info: str | None = None


class PartyResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID
    party_name: str
    party_role: str
    contact_info: str | None = None
    created_at: datetime
