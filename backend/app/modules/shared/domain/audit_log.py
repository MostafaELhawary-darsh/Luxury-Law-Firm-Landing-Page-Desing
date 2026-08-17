from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import DateTime, Index, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.dependencies import Base


class AuditLog(Base):
    __tablename__ = "shared_audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    module_id: Mapped[str] = mapped_column(String(16), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)

    __table_args__ = (
        Index("ix_shared_audit_logs_user_id", "user_id"),
        Index("ix_shared_audit_logs_module_id", "module_id"),
        Index("ix_shared_audit_logs_timestamp", "timestamp"),
    )

    _immutable = True

    def __setattr__(self, key: str, value: Any) -> None:
        if key.startswith("_sa_") or key == "_immutable":
            super().__setattr__(key, value)
            return
        if getattr(self, "_immutable", False):
            existing = getattr(self, key, None)
            if existing is not None and key != "metadata_":
                raise RuntimeError(
                    f"AuditLog is immutable; cannot modify field '{key}' after creation"
                )
        super().__setattr__(key, value)

    def freeze(self) -> None:
        object.__setattr__(self, "_immutable", True)
