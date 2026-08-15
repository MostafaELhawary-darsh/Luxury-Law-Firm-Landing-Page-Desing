from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.shared.domain.task_ticket import TaskStatus, TaskTicket
from app.modules.shared.schemas.task_ticket import TaskTicketCreate, TaskTicketUpdate


class TicketService:
    async def create(
        self,
        db: AsyncSession,
        ticket_data: TaskTicketCreate,
    ) -> TaskTicket:
        ticket = TaskTicket(
            title=ticket_data.title,
            description=ticket_data.description,
            assigned_to=ticket_data.assigned_to,
            created_by=ticket_data.created_by,
            priority=ticket_data.priority,
            status=TaskStatus.OPEN,
            module_source=ticket_data.module_source,
        )
        db.add(ticket)
        await db.commit()
        await db.refresh(ticket)
        return ticket

    async def get(self, db: AsyncSession, ticket_id: UUID) -> TaskTicket | None:
        stmt = select(TaskTicket).where(TaskTicket.id == str(ticket_id))
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        db: AsyncSession,
        status: TaskStatus | None = None,
        assigned_to: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[TaskTicket]:
        stmt = (
            select(TaskTicket)
            .order_by(TaskTicket.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if status:
            stmt = stmt.where(TaskTicket.status == status)
        if assigned_to:
            stmt = stmt.where(TaskTicket.assigned_to == assigned_to)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def update(
        self,
        db: AsyncSession,
        ticket_id: UUID,
        ticket_data: TaskTicketUpdate,
    ) -> TaskTicket | None:
        values = ticket_data.model_dump(exclude_unset=True)
        if not values:
            return await self.get(db, ticket_id)

        values["updated_at"] = datetime.utcnow()
        if "status" in values and values["status"] == TaskStatus.COMPLETED.value:
            values["closed_at"] = datetime.utcnow()

        stmt = (
            update(TaskTicket)
            .where(TaskTicket.id == str(ticket_id))
            .values(**values)
            .returning(TaskTicket)
        )
        result = await db.execute(stmt)
        row = result.scalar_one_or_none()
        await db.commit()
        return row

    async def close(self, db: AsyncSession, ticket_id: UUID) -> TaskTicket | None:
        now = datetime.utcnow()
        stmt = (
            update(TaskTicket)
            .where(TaskTicket.id == str(ticket_id))
            .values(status=TaskStatus.COMPLETED, closed_at=now, updated_at=now)
            .returning(TaskTicket)
        )
        result = await db.execute(stmt)
        row = result.scalar_one_or_none()
        await db.commit()
        return row
