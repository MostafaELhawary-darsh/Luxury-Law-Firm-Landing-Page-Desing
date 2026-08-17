from __future__ import annotations

from typing import Any

from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.shared.domain.audit_log import AuditLog


class AuditService:
    def __init__(self, db: AsyncSession | None = None) -> None:
        self._db = db

    async def log(
        self,
        db: AsyncSession | None = None,
        user_id: str | None = None,
        module_id: str | None = None,
        action: str | None = None,
        resource_id: str | None = None,
        ip: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> AuditLog:
        session = db or self._db
        if session is None:
            raise ValueError("Database session is required")

        if user_id is None:
            raise ValueError("user_id is required")

        effective_module_id = module_id or (action.split(":")[0] if action and ":" in action else "SHARED")

        stmt = (
            insert(AuditLog)
            .values(
                user_id=user_id,
                module_id=effective_module_id,
                action=action or "UNKNOWN",
                resource_id=resource_id,
                ip_address=ip,
                metadata_=metadata,
            )
            .returning(AuditLog)
        )
        result = await session.execute(stmt)
        row = result.scalar_one()
        await session.commit()
        return row

    async def get_logs(
        self,
        db: AsyncSession | None = None,
        user_id: str | None = None,
        module_id: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[AuditLog]:
        session = db or self._db
        if session is None:
            raise ValueError("Database session is required")

        stmt = (
            select(AuditLog)
            .order_by(AuditLog.timestamp.desc())
            .limit(limit)
            .offset(offset)
        )
        if user_id:
            stmt = stmt.where(AuditLog.user_id == user_id)
        if module_id:
            stmt = stmt.where(AuditLog.module_id == module_id)
        result = await session.execute(stmt)
        return list(result.scalars().all())
