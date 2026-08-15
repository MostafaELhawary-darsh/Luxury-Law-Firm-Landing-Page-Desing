from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.m54_editor_financial.domain.entities import DocumentTemplate
from app.modules.m54_editor_financial.schemas.document_schemas import (
    TemplateCreateSchema,
    TemplateResponseSchema,
)


class TemplateService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_template(
        self, payload: TemplateCreateSchema, user_id: str
    ) -> TemplateResponseSchema:
        template = DocumentTemplate(
            name=payload.name,
            template_type=payload.template_type,
            content=payload.content,
            variables=payload.variables,
            is_active=payload.is_active,
            created_by=user_id,
        )
        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)
        return TemplateResponseSchema.model_validate(template)

    async def get_template(self, template_id: UUID) -> TemplateResponseSchema:
        stmt = select(DocumentTemplate).where(DocumentTemplate.id == str(template_id))
        result = await self.db.execute(stmt)
        template = result.scalar_one_or_none()
        if template is None:
            raise ValueError(f"Template {template_id} not found")
        return TemplateResponseSchema.model_validate(template)

    async def list_templates(
        self, skip: int = 0, limit: int = 50
    ) -> list[TemplateResponseSchema]:
        stmt = (
            select(DocumentTemplate)
            .where(DocumentTemplate.is_active == True)  # noqa: E712
            .offset(skip)
            .limit(limit)
            .order_by(DocumentTemplate.created_at.desc())
        )
        result = await self.db.execute(stmt)
        templates = result.scalars().all()
        return [TemplateResponseSchema.model_validate(t) for t in templates]

    async def render_template(
        self, template_id: UUID, variables: dict
    ) -> str:
        stmt = select(DocumentTemplate).where(DocumentTemplate.id == str(template_id))
        result = await self.db.execute(stmt)
        template = result.scalar_one_or_none()
        if template is None:
            raise ValueError(f"Template {template_id} not found")
        rendered = template.content
        for key, value in variables.items():
            rendered = rendered.replace("{{" + key + "}}", str(value))
            rendered = rendered.replace("{{ " + key + " }}", str(value))
        return rendered
