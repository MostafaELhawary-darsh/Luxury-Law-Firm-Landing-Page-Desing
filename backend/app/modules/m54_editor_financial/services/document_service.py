from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CryptoService
from app.modules.m54_editor_financial.domain.entities import (
    FinancialApproval,
    FinancialDocument,
    FinancialLineItem,
)
from app.modules.m54_editor_financial.schemas.document_schemas import (
    ApprovalCreateSchema,
    ApprovalResponseSchema,
    DocumentCreateSchema,
    DocumentResponseSchema,
    DocumentUpdateSchema,
    LineItemResponseSchema,
    LineItemSchema,
    TemplateCreateSchema,
    TemplateResponseSchema,
    TotalsResponseSchema,
)
from app.modules.shared.services.audit_service import AuditService

_SENSITIVE_DOC_FIELDS = ("description",)


class FinancialDocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.crypto = CryptoService()
        self.audit = AuditService(db)

    async def create_document(
        self, payload: DocumentCreateSchema, user_id: str
    ) -> DocumentResponseSchema:
        doc = FinancialDocument(
            doc_number=f"M54-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid4().hex[:8]}",
            doc_type=payload.doc_type,
            title=payload.title,
            case_id=payload.case_id,
            client_id=payload.client_id,
            amount=payload.amount,
            currency=payload.currency,
            status="DRAFT",
            created_by=user_id,
            description=(
                self.crypto.encrypt(payload.description)
                if payload.description
                else None
            ),
            is_encrypted=bool(payload.description),
        )
        self.db.add(doc)
        await self.db.flush()

        line_item_responses: list[LineItemResponseSchema] = []
        for item in payload.line_items:
            total = item.quantity * item.unit_price
            li = FinancialLineItem(
                document_id=doc.id,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=total,
                tax_rate=item.tax_rate,
                line_type=item.line_type,
            )
            self.db.add(li)
            await self.db.flush()
            line_item_responses.append(self._line_item_to_response(li))

        await self.db.commit()
        await self.db.refresh(doc)

        await self.audit.log(
            user_id=user_id,
            module_id="M54",
            action="M54:DOC:CREATE",
            resource_id=str(doc.id),
            metadata={"doc_number": doc.doc_number, "title": doc.title},
        )

        return self._to_response(doc, line_item_responses)

    async def get_document(self, doc_id: UUID) -> DocumentResponseSchema:
        stmt = select(FinancialDocument).where(FinancialDocument.id == str(doc_id))
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()
        if doc is None:
            raise ValueError(f"Document {doc_id} not found")
        line_items = await self._get_line_items(doc.id)
        return self._to_response(doc, line_items)

    async def list_documents(
        self,
        skip: int = 0,
        limit: int = 50,
        status_filter: str | None = None,
        doc_type: str | None = None,
    ) -> list[DocumentResponseSchema]:
        stmt = (
            select(FinancialDocument)
            .offset(skip)
            .limit(limit)
            .order_by(FinancialDocument.created_at.desc())
        )
        if status_filter is not None:
            stmt = stmt.where(FinancialDocument.status == status_filter)
        if doc_type is not None:
            stmt = stmt.where(FinancialDocument.doc_type == doc_type)
        result = await self.db.execute(stmt)
        docs = result.scalars().all()
        responses: list[DocumentResponseSchema] = []
        for d in docs:
            items = await self._get_line_items(d.id)
            responses.append(self._to_response(d, items))
        return responses

    async def update_document(
        self, doc_id: UUID, payload: DocumentUpdateSchema, user_id: str
    ) -> DocumentResponseSchema:
        stmt = select(FinancialDocument).where(FinancialDocument.id == str(doc_id))
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()
        if doc is None:
            raise ValueError(f"Document {doc_id} not found")

        update_data = payload.model_dump(exclude_unset=True)
        for field in _SENSITIVE_DOC_FIELDS:
            if field in update_data and update_data[field] is not None:
                update_data[field] = self.crypto.encrypt(update_data[field])

        for key, value in update_data.items():
            setattr(doc, key, value)

        await self.db.commit()
        await self.db.refresh(doc)

        await self.audit.log(
            user_id=user_id,
            module_id="M54",
            action="M54:DOC:UPDATE",
            resource_id=str(doc.id),
            metadata=update_data,
        )

        items = await self._get_line_items(doc.id)
        return self._to_response(doc, items)

    async def delete_document(self, doc_id: UUID, user_id: str) -> bool:
        stmt = select(FinancialDocument).where(FinancialDocument.id == str(doc_id))
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()
        if doc is None:
            return False

        await self.db.delete(doc)
        await self.db.commit()

        await self.audit.log(
            user_id=user_id,
            module_id="M54",
            action="M54:DOC:DELETE",
            resource_id=str(doc_id),
            metadata={"doc_number": doc.doc_number},
        )
        return True

    async def submit_for_approval(
        self, doc_id: UUID, user_id: str
    ) -> DocumentResponseSchema:
        stmt = select(FinancialDocument).where(FinancialDocument.id == str(doc_id))
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()
        if doc is None:
            raise ValueError(f"Document {doc_id} not found")

        doc.status = "PENDING_APPROVAL"
        await self.db.commit()
        await self.db.refresh(doc)

        await self.audit.log(
            user_id=user_id,
            module_id="M54",
            action="M54:DOC:SUBMIT",
            resource_id=str(doc.id),
            metadata={"doc_number": doc.doc_number},
        )

        items = await self._get_line_items(doc.id)
        return self._to_response(doc, items)

    async def approve_document(
        self, doc_id: UUID, approver_id: str, comments: str | None
    ) -> DocumentResponseSchema:
        stmt = select(FinancialDocument).where(FinancialDocument.id == str(doc_id))
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()
        if doc is None:
            raise ValueError(f"Document {doc_id} not found")

        doc.status = "APPROVED"
        doc.approved_by = approver_id
        doc.approved_at = datetime.utcnow()

        approval = FinancialApproval(
            document_id=doc.id,
            approver_id=approver_id,
            approver_role="approver",
            approval_status="APPROVED",
            comments=comments,
            approved_at=datetime.utcnow(),
        )
        self.db.add(approval)
        await self.db.commit()
        await self.db.refresh(doc)

        await self.audit.log(
            user_id=approver_id,
            module_id="M54",
            action="M54:DOC:APPROVE",
            resource_id=str(doc.id),
            metadata={"comments": comments},
        )

        items = await self._get_line_items(doc.id)
        return self._to_response(doc, items)

    async def reject_document(
        self, doc_id: UUID, approver_id: str, comments: str
    ) -> DocumentResponseSchema:
        stmt = select(FinancialDocument).where(FinancialDocument.id == str(doc_id))
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()
        if doc is None:
            raise ValueError(f"Document {doc_id} not found")

        doc.status = "REJECTED"

        approval = FinancialApproval(
            document_id=doc.id,
            approver_id=approver_id,
            approver_role="approver",
            approval_status="REJECTED",
            comments=comments,
            approved_at=datetime.utcnow(),
        )
        self.db.add(approval)
        await self.db.commit()
        await self.db.refresh(doc)

        await self.audit.log(
            user_id=approver_id,
            module_id="M54",
            action="M54:DOC:REJECT",
            resource_id=str(doc.id),
            metadata={"comments": comments},
        )

        items = await self._get_line_items(doc.id)
        return self._to_response(doc, items)

    async def add_line_item(
        self, doc_id: UUID, payload: LineItemSchema
    ) -> DocumentResponseSchema:
        stmt = select(FinancialDocument).where(FinancialDocument.id == str(doc_id))
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()
        if doc is None:
            raise ValueError(f"Document {doc_id} not found")

        total = payload.quantity * payload.unit_price
        li = FinancialLineItem(
            document_id=doc.id,
            description=payload.description,
            quantity=payload.quantity,
            unit_price=payload.unit_price,
            total_price=total,
            tax_rate=payload.tax_rate,
            line_type=payload.line_type,
        )
        self.db.add(li)
        await self.db.commit()
        await self.db.refresh(doc)

        items = await self._get_line_items(doc.id)
        return self._to_response(doc, items)

    async def compute_totals(self, doc_id: UUID) -> TotalsResponseSchema:
        items = await self._get_line_items(str(doc_id))
        subtotal = Decimal("0")
        tax_total = Decimal("0")
        for item in items:
            line_total = item.quantity * item.unit_price
            subtotal += line_total
            tax_total += line_total * item.tax_rate / Decimal("100")
        grand_total = subtotal + tax_total
        return TotalsResponseSchema(
            document_id=doc_id,
            subtotal=subtotal,
            tax_total=tax_total,
            grand_total=grand_total,
        )

    async def _get_line_items(self, doc_id: str) -> list[LineItemResponseSchema]:
        stmt = (
            select(FinancialLineItem)
            .where(FinancialLineItem.document_id == doc_id)
            .order_by(FinancialLineItem.created_at.asc())
        )
        result = await self.db.execute(stmt)
        items = result.scalars().all()
        return [self._line_item_to_response(li) for li in items]

    def _line_item_to_response(self, li: FinancialLineItem) -> LineItemResponseSchema:
        return LineItemResponseSchema(
            id=li.id,
            document_id=li.document_id,
            description=li.description,
            quantity=li.quantity,
            unit_price=li.unit_price,
            total_price=li.total_price,
            tax_rate=li.tax_rate,
            line_type=li.line_type,
            created_at=li.created_at,
        )

    def _to_response(
        self, doc: FinancialDocument, line_items: list[LineItemResponseSchema]
    ) -> DocumentResponseSchema:
        return DocumentResponseSchema(
            id=doc.id,
            doc_number=doc.doc_number,
            doc_type=doc.doc_type,
            title=doc.title,
            case_id=doc.case_id,
            client_id=doc.client_id,
            amount=doc.amount,
            currency=doc.currency,
            status=doc.status,
            created_by=doc.created_by,
            approved_by=doc.approved_by,
            description=self._decrypt_if_needed(doc.description),
            is_encrypted=doc.is_encrypted,
            metadata_=doc.metadata_,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
            approved_at=doc.approved_at,
            line_items=line_items,
        )

    def _decrypt_if_needed(self, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            return self.crypto.decrypt(value)
        except Exception:
            return value



