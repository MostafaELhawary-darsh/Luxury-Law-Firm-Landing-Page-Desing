from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_async_db, get_current_user
from app.middleware.rbac_middleware import require_permission
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
from app.modules.m06_smart_case.services.case_service import SmartCaseService

router = APIRouter(
    prefix="/api/v1/m06",
    tags=["M06 - Smart Case Nucleus"],
)


@router.post(
    "/cases",
    response_model=CaseResponseSchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("M06:CASE:CREATE"))],
)
async def create_case(
    payload: CaseCreateSchema,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> CaseResponseSchema:
    service = SmartCaseService(db)
    return await service.create_case(payload, user_id=current_user["id"])


@router.get(
    "/cases",
    response_model=list[CaseResponseSchema],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("M06:CASE:READ"))],
)
async def list_cases(
    skip: int = 0,
    limit: int = 50,
    status: str | None = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> list[CaseResponseSchema]:
    service = SmartCaseService(db)
    return await service.list_cases(skip=skip, limit=limit, status_filter=status)


@router.get(
    "/cases/{case_id}",
    response_model=CaseResponseSchema,
    status_code=status.HTTP_200_OK,
)
async def get_case(
    case_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> CaseResponseSchema:
    service = SmartCaseService(db)
    try:
        return await service.get_case(case_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.put(
    "/cases/{case_id}",
    response_model=CaseResponseSchema,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("M06:CASE:UPDATE"))],
)
async def update_case(
    case_id: UUID,
    payload: CaseUpdateSchema,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> CaseResponseSchema:
    service = SmartCaseService(db)
    try:
        return await service.update_case(case_id, payload, user_id=current_user["id"])
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete(
    "/cases/{case_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("M06:CASE:DELETE"))],
)
async def delete_case(
    case_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> None:
    service = SmartCaseService(db)
    deleted = await service.delete_case(case_id, user_id=current_user["id"])
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found")


@router.post(
    "/cases/{case_id}/hearings",
    response_model=HearingResponseSchema,
    status_code=status.HTTP_201_CREATED,
)
async def add_hearing(
    case_id: UUID,
    payload: HearingCreateSchema,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> HearingResponseSchema:
    service = SmartCaseService(db)
    return await service.add_hearing(case_id, payload)


@router.post(
    "/cases/{case_id}/documents",
    response_model=DocumentResponseSchema,
    status_code=status.HTTP_201_CREATED,
)
async def add_document(
    case_id: UUID,
    payload: DocumentCreateSchema,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> DocumentResponseSchema:
    service = SmartCaseService(db)
    return await service.add_document(case_id, payload)


@router.post(
    "/cases/{case_id}/parties",
    response_model=PartyResponseSchema,
    status_code=status.HTTP_201_CREATED,
)
async def add_party(
    case_id: UUID,
    payload: PartyCreateSchema,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> PartyResponseSchema:
    service = SmartCaseService(db)
    return await service.add_party(case_id, payload)


@router.get(
    "/cases/{case_id}/hearings",
    response_model=list[HearingResponseSchema],
    status_code=status.HTTP_200_OK,
)
async def list_hearings(
    case_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> list[HearingResponseSchema]:
    service = SmartCaseService(db)
    return await service.list_hearings(case_id)
