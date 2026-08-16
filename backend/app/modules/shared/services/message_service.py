from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.shared.domain.internal_message import InternalMessage
from app.modules.shared.schemas.internal_message import MessageCreate


class MessageService:
    async def send_message(
        self,
        db: AsyncSession,
        message_data: MessageCreate,
    ) -> InternalMessage:
        message = InternalMessage(
            sender_id=message_data.sender_id,
            recipient_id=message_data.recipient_id,
            subject=message_data.subject,
            body=message_data.body,
            is_encrypted=message_data.is_encrypted,
            is_read=False,
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)
        return message

    async def mark_read(self, db: AsyncSession, message_id: UUID) -> InternalMessage | None:
        now = datetime.utcnow()
        stmt = (
            update(InternalMessage)
            .where(InternalMessage.id == str(message_id))
            .values(is_read=True, read_at=now)
            .returning(InternalMessage)
        )
        result = await db.execute(stmt)
        row = result.scalar_one_or_none()
        await db.commit()
        return row

    async def list_inbox(
        self,
        db: AsyncSession,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[InternalMessage]:
        stmt = (
            select(InternalMessage)
            .where(InternalMessage.recipient_id == user_id)
            .order_by(InternalMessage.sent_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if unread_only:
            stmt = stmt.where(InternalMessage.is_read == False)  # noqa: E712
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def list_sent(
        self,
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[InternalMessage]:
        stmt = (
            select(InternalMessage)
            .where(InternalMessage.sender_id == user_id)
            .order_by(InternalMessage.sent_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_message(self, db: AsyncSession, message_id: UUID) -> InternalMessage | None:
        stmt = select(InternalMessage).where(InternalMessage.id == str(message_id))
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
