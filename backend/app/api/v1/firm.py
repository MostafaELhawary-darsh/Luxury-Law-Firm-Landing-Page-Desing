from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, APIRouter, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.firm_models import Case as CaseModel
from package.firm.types import Case, CaseCreate

router = APIRouter()

@router.post("/cases", response_model=Case)
async def create_case(payload: CaseCreate, db: AsyncSession = Depends(get_db)):
    obj = CaseModel(
        case_number=payload.case_number or str(datetime.utcnow().timestamp()),
        case_title=payload.case_title,
        case_type=payload.case_type or None,
        court_level=payload.court_level or None,
        court_name=payload.court_name or None,
        subject=payload.subject or None,
        client_id=payload.client_id,
        responsible_attorney_id=payload.responsible_attorney_id,
        opposing_party=payload.opposing_party or None,
        status=payload.status or "open",
        filed_date=payload.filed_date,
        next_session_date=payload.next_session_date,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    # map to pydantic Case
    return Case.from_orm(obj)

@router.get("/cases", response_model=list[Case])
async def list_cases(db: AsyncSession = Depends(get_db)):
    q = await db.execute(select(CaseModel).limit(100))
    rows = q.scalars().all()
    return [Case.from_orm(r) for r in rows]

@router.get("/cases/{case_id}", response_model=Case)
async def get_case(case_id: str, db: AsyncSession = Depends(get_db)):
    q = await db.execute(select(CaseModel).where(CaseModel.id==case_id))
    obj = q.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Case not found")
    return Case.from_orm(obj)
