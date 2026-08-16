from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_async_db, get_current_user
from app.middleware.rbac_middleware import require_permission
from app.modules.shared.domain.internal_message import InternalMessage
from app.modules.shared.domain.task_ticket import TaskStatus, TaskTicket
from app.modules.shared.schemas.audit_log import AuditLogCreate, AuditLogResponse
from app.modules.shared.schemas.internal_message import MessageCreate, MessageResponse
from app.modules.shared.schemas.task_ticket import (
    TaskTicketCreate,
    TaskTicketResponse,
    TaskTicketUpdate,
)
from app.modules.shared.services.audit_service import AuditService
from app.modules.shared.services.message_service import MessageService
from app.modules.shared.services.ticket_service import TicketService

router = APIRouter(
    prefix="/api/v1/shared",
    tags=["Shared - Audit, Tickets, Messaging"],
)

_audit_service = AuditService()
_ticket_service = TicketService()
_message_service = MessageService()


@router.post(
    "/audit-logs",
    response_model=AuditLogResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("shared:AUDIT:WRITE"))],
)
async def create_audit_log(
    payload: AuditLogCreate,
    db: AsyncSession = Depends(get_async_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> AuditLogResponse:
    record = await _audit_service.log(
        db,
        user_id=payload.user_id,
        module_id=payload.module_id,
        action=payload.action,
        resource_id=payload.resource_id,
        ip=payload.ip_address,
        metadata=payload.metadata,
    )
    return AuditLogResponse.model_validate(record)


@router.get(
    "/audit-logs",
    response_model=list[AuditLogResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("shared:AUDIT:READ"))],
)
async def list_audit_logs(
    user_id: str | None = Query(None),
    module_id: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
) -> list[AuditLogResponse]:
    logs = await _audit_service.get_logs(
        db,
        user_id=user_id,
        module_id=module_id,
        limit=limit,
        offset=offset,
    )
    return [AuditLogResponse.model_validate(log) for log in logs]


@router.post(
    "/tickets",
    response_model=TaskTicketResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("shared:TICKET:CREATE"))],
)
async def create_ticket(
    payload: TaskTicketCreate,
    db: AsyncSession = Depends(get_async_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> TaskTicketResponse:
    ticket = await _ticket_service.create(db, payload)
    return TaskTicketResponse.model_validate(ticket)


@router.get(
    "/tickets",
    response_model=list[TaskTicketResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("shared:TICKET:READ"))],
)
async def list_tickets(
    status_filter: TaskStatus | None = Query(None, alias="status"),
    assigned_to: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
) -> list[TaskTicketResponse]:
    tickets = await _ticket_service.list(
        db,
        status=status_filter,
        assigned_to=assigned_to,
        limit=limit,
        offset=offset,
    )
    return [TaskTicketResponse.model_validate(t) for t in tickets]


@router.get(
    "/tickets/{ticket_id}",
    response_model=TaskTicketResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("shared:TICKET:READ"))],
)
async def get_ticket(
    ticket_id: UUID,
    db: AsyncSession = Depends(get_async_db),
) -> TaskTicketResponse:
    ticket = await _ticket_service.get(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return TaskTicketResponse.model_validate(ticket)


@router.patch(
    "/tickets/{ticket_id}",
    response_model=TaskTicketResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("shared:TICKET:UPDATE"))],
)
async def update_ticket(
    ticket_id: UUID,
    payload: TaskTicketUpdate,
    db: AsyncSession = Depends(get_async_db),
) -> TaskTicketResponse:
    ticket = await _ticket_service.update(db, ticket_id, payload)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return TaskTicketResponse.model_validate(ticket)


@router.post(
    "/tickets/{ticket_id}/close",
    response_model=TaskTicketResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("shared:TICKET:UPDATE"))],
)
async def close_ticket(
    ticket_id: UUID,
    db: AsyncSession = Depends(get_async_db),
) -> TaskTicketResponse:
    ticket = await _ticket_service.close(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return TaskTicketResponse.model_validate(ticket)


@router.delete(
    "/tickets/{ticket_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("shared:TICKET:DELETE"))],
)
async def delete_ticket(
    ticket_id: UUID,
    db: AsyncSession = Depends(get_async_db),
) -> None:
    stmt = sa_delete(TaskTicket).where(TaskTicket.id == str(ticket_id))
    result = await db.execute(stmt)
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")


@router.post(
    "/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("shared:MESSAGE:CREATE"))],
)
async def send_message(
    payload: MessageCreate,
    db: AsyncSession = Depends(get_async_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> MessageResponse:
    message = await _message_service.send_message(db, payload)
    return MessageResponse.model_validate(message)


@router.get(
    "/messages/inbox",
    response_model=list[MessageResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("shared:MESSAGE:READ"))],
)
async def list_inbox(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> list[MessageResponse]:
    messages = await _message_service.list_inbox(
        db,
        user_id=user.get("id", ""),
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )
    return [MessageResponse.model_validate(m) for m in messages]


@router.get(
    "/messages/sent",
    response_model=list[MessageResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("shared:MESSAGE:READ"))],
)
async def list_sent(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> list[MessageResponse]:
    messages = await _message_service.list_sent(
        db,
        user_id=user.get("id", ""),
        limit=limit,
        offset=offset,
    )
    return [MessageResponse.model_validate(m) for m in messages]


@router.get(
    "/messages/{message_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("shared:MESSAGE:READ"))],
)
async def get_message(
    message_id: UUID,
    db: AsyncSession = Depends(get_async_db),
) -> MessageResponse:
    message = await _message_service.get_message(db, message_id)
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return MessageResponse.model_validate(message)


@router.post(
    "/messages/{message_id}/read",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("shared:MESSAGE:READ"))],
)
async def mark_message_read(
    message_id: UUID,
    db: AsyncSession = Depends(get_async_db),
) -> MessageResponse:
    message = await _message_service.mark_read(db, message_id)
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return MessageResponse.model_validate(message)


@router.delete(
    "/messages/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("shared:MESSAGE:DELETE"))],
)
async def delete_message(
    message_id: UUID,
    db: AsyncSession = Depends(get_async_db),
) -> None:
    stmt = sa_delete(InternalMessage).where(InternalMessage.id == str(message_id))
    result = await db.execute(stmt)
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
