from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.dependencies import Base


class Case(Base):
    __tablename__ = "m06_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_number: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(512))
    case_type: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(64), default="OPEN")
    court: Mapped[str | None] = mapped_column(String(255), nullable=True)
    judge_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    plaintiff: Mapped[str | None] = mapped_column(Text, nullable=True)
    defendant: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_lawyer_id: Mapped[str] = mapped_column(String(36), index=True)
    client_id: Mapped[str] = mapped_column(String(36), index=True)
    opened_date: Mapped[datetime] = mapped_column(DateTime)
    closed_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    next_hearing_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    priority: Mapped[str] = mapped_column(String(32), default="MEDIUM")
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CaseHearing(Base):
    __tablename__ = "m06_case_hearings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("m06_cases.id", ondelete="CASCADE"),
        index=True,
    )
    hearing_date: Mapped[datetime] = mapped_column(DateTime)
    hearing_type: Mapped[str] = mapped_column(String(64))
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CaseDocument(Base):
    __tablename__ = "m06_case_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("m06_cases.id", ondelete="CASCADE"),
        index=True,
    )
    document_type: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(512))
    file_path: Mapped[str] = mapped_column(String(1024))
    uploaded_by: Mapped[str] = mapped_column(String(36))
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CaseParty(Base):
    __tablename__ = "m06_case_parties"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("m06_cases.id", ondelete="CASCADE"),
        index=True,
    )
    party_name: Mapped[str] = mapped_column(Text)
    party_role: Mapped[str] = mapped_column(String(64))
    contact_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
