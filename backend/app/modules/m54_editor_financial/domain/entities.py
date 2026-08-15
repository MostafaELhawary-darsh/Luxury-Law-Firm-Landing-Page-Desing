from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.dependencies import Base


class FinancialDocument(Base):
    __tablename__ = "m54_financial_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    doc_number: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    doc_type: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(512))
    case_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    client_id: Mapped[str] = mapped_column(String(36), index=True)
    amount: Mapped[float] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(8), default="EGP")
    status: Mapped[str] = mapped_column(String(64), default="DRAFT")
    created_by: Mapped[str] = mapped_column(String(36))
    approved_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class FinancialLineItem(Base):
    __tablename__ = "m54_line_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("m54_financial_documents.id", ondelete="CASCADE"),
        index=True,
    )
    description: Mapped[str] = mapped_column(String(512))
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(14, 2))
    total_price: Mapped[float] = mapped_column(Numeric(14, 2))
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    line_type: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DocumentTemplate(Base):
    __tablename__ = "m54_document_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), unique=True)
    template_type: Mapped[str] = mapped_column(String(64))
    content: Mapped[str] = mapped_column(Text)
    variables: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class FinancialApproval(Base):
    __tablename__ = "m54_approvals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("m54_financial_documents.id", ondelete="CASCADE"),
        index=True,
    )
    approver_id: Mapped[str] = mapped_column(String(36))
    approver_role: Mapped[str] = mapped_column(String(64))
    approval_status: Mapped[str] = mapped_column(String(64), default="PENDING")
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
