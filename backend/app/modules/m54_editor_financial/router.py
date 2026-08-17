from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_async_db, get_current_user
from app.middleware.rbac_middleware import require_permission
from app.modules.m54_editor_financial.schemas.document_schemas import (
    ApprovalCreateSchema,
    ApprovalResponseSchema,
    DocumentCreateSchema,
    DocumentResponseSchema,
    DocumentUpdateSchema,
    LineItemSchema,
    TemplateCreateSchema,
    TemplateResponseSchema,
    TotalsResponseSchema,
)
from app.modules.m54_editor_financial.services.document_service import (
    FinancialDocumentService,
)
from app.modules.m54_editor_financial.services.template_service import TemplateService

router = APIRouter(
    prefix="/api/v1/m54",
    tags=["M54 - Financial & Document Editor"],
)


@router.post(
    "/documents",
    response_model=DocumentResponseSchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("M54:DOC:CREATE"))],
)
async def create_document(
    payload: DocumentCreateSchema,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> DocumentResponseSchema:
    service = FinancialDocumentService(db)
    return await service.create_document(payload, user_id=current_user["id"])


@router.get(
    "/documents",
    response_model=list[DocumentResponseSchema],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("M54:DOC:READ"))],
)
async def list_documents(
    skip: int = 0,
    limit: int = 50,
    status: str | None = None,
    doc_type: str | None = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> list[DocumentResponseSchema]:
    service = FinancialDocumentService(db)
    return await service.list_documents(
        skip=skip, limit=limit, status_filter=status, doc_type=doc_type
    )


@router.get(
    "/documents/{doc_id}",
    response_model=DocumentResponseSchema,
    status_code=status.HTTP_200_OK,
)
async def get_document(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> DocumentResponseSchema:
    service = FinancialDocumentService(db)
    try:
        return await service.get_document(doc_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.put(
    "/documents/{doc_id}",
    response_model=DocumentResponseSchema,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("M54:DOC:UPDATE"))],
)
async def update_document(
    doc_id: UUID,
    payload: DocumentUpdateSchema,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> DocumentResponseSchema:
    service = FinancialDocumentService(db)
    try:
        return await service.update_document(doc_id, payload, user_id=current_user["id"])
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete(
    "/documents/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("M54:DOC:DELETE"))],
)
async def delete_document(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> None:
    service = FinancialDocumentService(db)
    deleted = await service.delete_document(doc_id, user_id=current_user["id"])
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {doc_id} not found",
        )


@router.post(
    "/documents/{doc_id}/submit",
    response_model=DocumentResponseSchema,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("M54:DOC:SUBMIT"))],
)
async def submit_for_approval(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> DocumentResponseSchema:
    service = FinancialDocumentService(db)
    try:
        return await service.submit_for_approval(doc_id, user_id=current_user["id"])
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post(
    "/documents/{doc_id}/approve",
    response_model=DocumentResponseSchema,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("M54:DOC:APPROVE"))],
)
async def approve_document(
    doc_id: UUID,
    payload: ApprovalCreateSchema,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> DocumentResponseSchema:
    service = FinancialDocumentService(db)
    try:
        return await service.approve_document(
            doc_id, approver_id=payload.approver_id, comments=payload.comments
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post(
    "/documents/{doc_id}/reject",
    response_model=DocumentResponseSchema,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("M54:DOC:APPROVE"))],
)
async def reject_document(
    doc_id: UUID,
    payload: ApprovalCreateSchema,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> DocumentResponseSchema:
    service = FinancialDocumentService(db)
    try:
        return await service.reject_document(
            doc_id,
            approver_id=payload.approver_id,
            comments=payload.comments or "",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post(
    "/documents/{doc_id}/line-items",
    response_model=DocumentResponseSchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("M54:DOC:UPDATE"))],
)
async def add_line_item(
    doc_id: UUID,
    payload: LineItemSchema,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> DocumentResponseSchema:
    service = FinancialDocumentService(db)
    try:
        return await service.add_line_item(doc_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get(
    "/documents/{doc_id}/totals",
    response_model=TotalsResponseSchema,
    status_code=status.HTTP_200_OK,
)
async def get_totals(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> TotalsResponseSchema:
    service = FinancialDocumentService(db)
    return await service.compute_totals(doc_id)


@router.get(
    "/templates",
    response_model=list[TemplateResponseSchema],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("M54:DOC:READ"))],
)
async def list_templates(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> list[TemplateResponseSchema]:
    service = TemplateService(db)
    return await service.list_templates(skip=skip, limit=limit)


@router.post(
    "/templates",
    response_model=TemplateResponseSchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("M54:TEMPLATE:CREATE"))],
)
async def create_template(
    payload: TemplateCreateSchema,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> TemplateResponseSchema:
    service = TemplateService(db)
    return await service.create_template(payload, user_id=current_user["id"])


@router.get(
    "/templates/{template_id}",
    response_model=TemplateResponseSchema,
    status_code=status.HTTP_200_OK,
)
async def get_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> TemplateResponseSchema:
    service = TemplateService(db)
    try:
        return await service.get_template(template_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post(
    "/templates/{template_id}/render",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("M54:DOC:READ"))],
)
async def render_template(
    template_id: UUID,
    variables: dict,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    service = TemplateService(db)
    try:
        rendered = await service.render_template(template_id, variables)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return {"rendered_content": rendered}
