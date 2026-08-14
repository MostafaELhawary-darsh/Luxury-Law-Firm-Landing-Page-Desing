from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.modules.shared.domain.task_ticket import TaskPriority, TaskStatus


class TaskTicketCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    description: str | None = Field(None, max_length=5000)
    assigned_to: str | None = Field(None, max_length=36)
    created_by: str = Field(..., max_length=36, description="ID of the user creating the ticket")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    module_source: str | None = Field(None, max_length=16, description="Module that triggered this ticket")


class TaskTicketUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=512)
    description: str | None = Field(None, max_length=5000)
    assigned_to: str | None = Field(None, max_length=36)
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    module_source: str | None = Field(None, max_length=16)


class TaskTicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str | None = None
    assigned_to: str | None = None
    created_by: str
    priority: TaskPriority
    status: TaskStatus
    module_source: str | None = None
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None = None
