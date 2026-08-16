from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MessageCreate(BaseModel):
    sender_id: str = Field(..., max_length=36, description="ID of the sender")
    recipient_id: str = Field(..., max_length=36, description="ID of the recipient")
    subject: str = Field(..., min_length=1, max_length=512)
    body: str = Field(..., min_length=1, max_length=10000)
    is_encrypted: bool = Field(default=False, description="Whether the body is encrypted at rest")


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sender_id: str
    recipient_id: str
    subject: str
    body: str
    is_read: bool
    is_encrypted: bool
    sent_at: datetime
    read_at: datetime | None = None
