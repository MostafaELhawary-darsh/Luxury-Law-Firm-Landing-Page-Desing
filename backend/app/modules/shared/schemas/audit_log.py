from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AuditLogCreate(BaseModel):
    user_id: str = Field(..., description="ID of the user performing the action")
    module_id: str = Field(..., description="Module identifier (e.g. M06, M54)")
    action: str = Field(..., description="Action performed (e.g. CREATE, READ, UPDATE, DELETE)")
    resource_id: str | None = Field(None, description="ID of the affected resource")
    ip_address: str | None = Field(None, description="IP address of the requester")
    metadata: dict[str, Any] | None = Field(None, description="Additional context as JSON")


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    user_id: str
    module_id: str
    action: str
    resource_id: str | None = None
    timestamp: datetime
    ip_address: str | None = None
    metadata_: dict[str, Any] | None = Field(None, alias="metadata")
