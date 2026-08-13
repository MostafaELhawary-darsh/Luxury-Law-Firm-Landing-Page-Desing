from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class CaseBase(BaseModel):
    """Base case schema."""
    case_number: str = Field(..., max_length=128)
    case_title: str = Field(..., max_length=512)
    case_type: Optional[str] = Field(None, max_length=128)
    court_level: Optional[str] = Field(None, max_length=128)
    court_name: Optional[str] = Field(None, max_length=256)
    subject: Optional[str] = None
    client_id: Optional[str] = Field(None, max_length=64)
    responsible_attorney_id: Optional[str] = Field(None, max_length=64)
    opposing_party: Optional[str] = Field(None, max_length=512)
    status: Optional[str] = Field(None, max_length=64)
    filed_date: Optional[str] = Field(None, max_length=64)
    next_session_date: Optional[str] = Field(None, max_length=64)

class CaseCreate(CaseBase):
    """Case creation schema."""
    pass

class CaseUpdate(BaseModel):
    """Case update schema."""
    case_title: Optional[str] = None
    case_type: Optional[str] = None
    court_level: Optional[str] = None
    court_name: Optional[str] = None
    subject: Optional[str] = None
    status: Optional[str] = None
    opposing_party: Optional[str] = None
    next_session_date: Optional[str] = None

class CaseResponse(CaseBase):
    """Case response schema."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
