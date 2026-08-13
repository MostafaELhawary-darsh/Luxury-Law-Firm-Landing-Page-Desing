from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from uuid import UUID
from typing import List
from app.db.session import get_db
from app.models.user_model import Case
from app.schemas.case import CaseCreate, CaseResponse, CaseUpdate

router = APIRouter(prefix="/cases", tags=["cases"])

@router.post("/", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(case_data: CaseCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new legal case.
    
    - **case_number**: Unique case number
    - **case_title**: Title of the case
    - **case_type**: Type of case (e.g., "Civil", "Criminal")
    - **status**: Current status (e.g., "Open", "Closed", "On Hold")
    """
    new_case = Case(**case_data.dict())
    db.add(new_case)
    await db.commit()
    await db.refresh(new_case)
    return new_case

@router.get("/", response_model=List[CaseResponse])
async def list_cases(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status_filter: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    List all cases with pagination and optional filtering.
    
    - **skip**: Number of cases to skip (pagination offset)
    - **limit**: Maximum number of cases to return
    - **status_filter**: Filter by case status
    """
    stmt = select(Case)
    
    if status_filter:
        stmt = stmt.where(Case.status == status_filter)
    
    stmt = stmt.order_by(desc(Case.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    cases = result.scalars().all()
    return cases

@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(case_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Get a specific case by ID.
    """
    stmt = select(Case).where(Case.id == case_id)
    result = await db.execute(stmt)
    case = result.scalars().first()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    return case

@router.put("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: UUID,
    case_data: CaseUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing case.
    """
    stmt = select(Case).where(Case.id == case_id)
    result = await db.execute(stmt)
    case = result.scalars().first()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    update_data = case_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(case, field, value)
    
    await db.commit()
    await db.refresh(case)
    return case

@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(case_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Delete a case.
    """
    stmt = select(Case).where(Case.id == case_id)
    result = await db.execute(stmt)
    case = result.scalars().first()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    await db.delete(case)
    await db.commit()
