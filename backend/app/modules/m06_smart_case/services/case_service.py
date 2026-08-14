from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CryptoService
from app.modules.m06_smart_case.domain.entities import (
    Case,
    CaseDocument,
    CaseHearing,
    CaseParty,
)
from app.modules.m06_smart_case.schemas.case_schemas import (
    CaseCreateSchema,
    CaseResponseSchema,
    CaseUpdateSchema,
    DocumentCreateSchema,
    DocumentResponseSchema,
    HearingCreateSchema,
    HearingResponseSchema,
    PartyCreateSchema,
    PartyResponseSchema,
)
from app.modules.shared.services.audit_service import AuditService

_SENSITIVE_CASE_FIELDS = ("plaintiff", "defendant")


class SmartCaseService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.crypto = CryptoService()
        self.audit = AuditService(db)

    async def create_case(
        self, payload: CaseCreateSchema, user_id: str
    ) -> CaseResponseSchema:
        case = Case(
            case_number=payload.case_number,
            title=payload.title,
            case_type=payload.case_type,
            status="OPEN",
            court=payload.court,
            judge_name=payload.judge_name,
            plaintiff=self.crypto.encrypt(payload.plaintiff),
            defendant=self.crypto.encrypt(payload.defendant),
            description=payload.description,
            assigned_lawyer_id=payload.assigned_lawyer_id,
            client_id=payload.client_id,
            opened_date=datetime.utcnow(),
            priority=payload.priority,
            is_encrypted=True,
        )
        self.db.add(case)
        await self.db.commit()
        await self.db.refresh(case)

        await self.audit.log(
            actor_id=user_id,
            action="M06:CASE:CREATE",
            resource_type="case",
            resource_id=str(case.id),
            details={"case_number": case.case_number, "title": case.title},
        )

        return self._to_response(case)

    async def get_case(self, case_id: UUID) -> CaseResponseSchema:
        stmt = select(Case).where(Case.id == str(case_id))
        result = await self.db.execute(stmt)
        case = result.scalar_one_or_none()
        if case is None:
            raise ValueError(f"Case {case_id} not found")
        return self._to_response(case)

    async def list_cases(
        self,
        skip: int = 0,
        limit: int = 50,
        status_filter: str | None = None,
    ) -> list[CaseResponseSchema]:
        stmt = select(Case).offset(skip).limit(limit).order_by(Case.created_at.desc())
        if status_filter is not None:
            stmt = stmt.where(Case.status == status_filter)
        result = await self.db.execute(stmt)
        cases = result.scalars().all()
        return [self._to_response(c) for c in cases]

    async def update_case(
        self, case_id: UUID, payload: CaseUpdateSchema, user_id: str
    ) -> CaseResponseSchema:
        stmt = select(Case).where(Case.id == str(case_id))
        result = await self.db.execute(stmt)
        case = result.scalar_one_or_none()
        if case is None:
            raise ValueError(f"Case {case_id} not found")

        update_data = payload.model_dump(exclude_unset=True)

        for field in _SENSITIVE_CASE_FIELDS:
            if field in update_data and update_data[field] is not None:
                update_data[field] = self.crypto.encrypt(update_data[field])

        for key, value in update_data.items():
            setattr(case, key, value)

        await self.db.commit()
        await self.db.refresh(case)

        await self.audit.log(
            actor_id=user_id,
            action="M06:CASE:UPDATE",
            resource_type="case",
            resource_id=str(case.id),
            details=update_data,
        )

        return self._to_response(case)

    async def delete_case(self, case_id: UUID, user_id: str) -> bool:
        stmt = select(Case).where(Case.id == str(case_id))
        result = await self.db.execute(stmt)
        case = result.scalar_one_or_none()
        if case is None:
            return False

        await self.db.delete(case)
        await self.db.commit()

        await self.audit.log(
            actor_id=user_id,
            action="M06:CASE:DELETE",
            resource_type="case",
            resource_id=str(case_id),
            details={"case_number": case.case_number},
        )

        return True

    async def add_hearing(
        self, case_id: UUID, payload: HearingCreateSchema
    ) -> HearingResponseSchema:
        hearing = CaseHearing(
            case_id=str(case_id),
            hearing_date=payload.hearing_date,
            hearing_type=payload.hearing_type,
            location=payload.location,
            notes=payload.notes,
            outcome=payload.outcome,
            is_completed=payload.is_completed,
        )
        self.db.add(hearing)
        await self.db.commit()
        await self.db.refresh(hearing)
        return HearingResponseSchema.model_validate(hearing)

    async def add_document(
        self, case_id: UUID, payload: DocumentCreateSchema
    ) -> DocumentResponseSchema:
        document = CaseDocument(
            case_id=str(case_id),
            document_type=payload.document_type,
            title=payload.title,
            file_path=payload.file_path,
            uploaded_by=payload.uploaded_by,
            is_encrypted=payload.is_encrypted,
        )
        self.db.add(document)
        await self.db.commit()
        await self.db.refresh(document)
        return DocumentResponseSchema.model_validate(document)

    async def add_party(
        self, case_id: UUID, payload: PartyCreateSchema
    ) -> PartyResponseSchema:
        party = CaseParty(
            case_id=str(case_id),
            party_name=self.crypto.encrypt(payload.party_name),
            party_role=payload.party_role,
            contact_info=(
                self.crypto.encrypt(payload.contact_info)
                if payload.contact_info is not None
                else None
            ),
        )
        self.db.add(party)
        await self.db.commit()
        await self.db.refresh(party)
        return self._party_to_response(party)

    async def list_hearings(
        self, case_id: UUID
    ) -> list[HearingResponseSchema]:
        stmt = (
            select(CaseHearing)
            .where(CaseHearing.case_id == str(case_id))
            .order_by(CaseHearing.hearing_date.asc())
        )
        result = await self.db.execute(stmt)
        hearings = result.scalars().all()
        return [HearingResponseSchema.model_validate(h) for h in hearings]

    def _to_response(self, case: Case) -> CaseResponseSchema:
        data = {
            "id": case.id,
            "case_number": case.case_number,
            "title": case.title,
            "case_type": case.case_type,
            "status": case.status,
            "court": case.court,
            "judge_name": case.judge_name,
            "plaintiff": self._decrypt_if_needed(case.plaintiff),
            "defendant": self._decrypt_if_needed(case.defendant),
            "description": case.description,
            "assigned_lawyer_id": case.assigned_lawyer_id,
            "client_id": case.client_id,
            "opened_date": case.opened_date,
            "closed_date": case.closed_date,
            "next_hearing_date": case.next_hearing_date,
            "priority": case.priority,
            "is_encrypted": case.is_encrypted,
            "metadata_": case.metadata_,
            "created_at": case.created_at,
            "updated_at": case.updated_at,
        }
        return CaseResponseSchema(**data)

    def _party_to_response(self, party: CaseParty) -> PartyResponseSchema:
        data = {
            "id": party.id,
            "case_id": party.case_id,
            "party_name": self._decrypt_if_needed(party.party_name),
            "party_role": party.party_role,
            "contact_info": self._decrypt_if_needed(party.contact_info),
            "created_at": party.created_at,
        }
        return PartyResponseSchema(**data)

    def _decrypt_if_needed(self, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            return self.crypto.decrypt(value)
        except Exception:
            return value
