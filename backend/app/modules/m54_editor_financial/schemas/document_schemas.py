from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LineItemSchema(BaseModel):
    description: str = Field(..., max_length=512)
    quantity: Decimal = Field(Decimal("1"), ge=0)
    unit_price: Decimal = Field(..., ge=0)
    tax_rate: Decimal = Field(Decimal("0"), ge=0, le=100)
    line_type: str = Field(..., max_length=64)


class LineItemResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    description: str
    quantity: Decimal
    unit_price: Decimal
    total_price: Decimal
    tax_rate: Decimal
    line_type: str
    created_at: datetime


class DocumentCreateSchema(BaseModel):
    doc_type: str = Field(..., max_length=64)
    title: str = Field(..., max_length=512)
    case_id: str | None = Field(None, max_length=36)
    client_id: str = Field(..., max_length=36)
    amount: Decimal = Field(..., ge=0)
    currency: str = Field("EGP", max_length=8)
    description: str | None = None
    line_items: list[LineItemSchema] = Field(default_factory=list)


class DocumentUpdateSchema(BaseModel):
    doc_type: str | None = Field(None, max_length=64)
    title: str | None = Field(None, max_length=512)
    case_id: str | None = Field(None, max_length=36)
    client_id: str | None = Field(None, max_length=36)
    amount: Decimal | None = Field(None, ge=0)
    currency: str | None = Field(None, max_length=8)
    status: str | None = Field(None, max_length=64)
    description: str | None = None
    metadata_: dict | None = None


class DocumentResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    doc_number: str
    doc_type: str
    title: str
    case_id: str | None = None
    client_id: str
    amount: Decimal
    currency: str
    status: str
    created_by: str
    approved_by: str | None = None
    description: str | None = None
    is_encrypted: bool
    metadata_: dict | None = None
    created_at: datetime
    updated_at: datetime
    approved_at: datetime | None = None
    line_items: list[LineItemResponseSchema] = Field(default_factory=list)


class TemplateCreateSchema(BaseModel):
    name: str = Field(..., max_length=255)
    template_type: str = Field(..., max_length=64)
    content: str
    variables: dict | None = None
    is_active: bool = True


class TemplateResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    template_type: str
    content: str
    variables: dict | None = None
    is_active: bool
    created_by: str
    created_at: datetime
    updated_at: datetime


class ApprovalCreateSchema(BaseModel):
    approver_id: str = Field(..., max_length=36)
    approver_role: str = Field(..., max_length=64)
    comments: str | None = None


class ApprovalResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    approver_id: str
    approver_role: str
    approval_status: str
    comments: str | None = None
    approved_at: datetime | None = None
    created_at: datetime


class TotalsResponseSchema(BaseModel):
    document_id: UUID
    subtotal: Decimal
    tax_total: Decimal
    grand_total: Decimal
