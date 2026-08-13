from fastapi import APIRouter, HTTPException
from typing import List
from package.firm.types import Case, CaseCreate
from uuid import uuid4

router = APIRouter()

# simple in-memory store for prototype
_cases = {}

@router.post("/cases", response_model=Case)
async def create_case(payload: CaseCreate):
    cid = str(uuid4())
    case = Case(id=cid, case_number=payload.case_number or cid, case_title=payload.case_title, case_type=payload.case_type or "", court_level=payload.court_level or "", court_name=payload.court_name or "", subject=payload.subject or "", client_id=payload.client_id, responsible_attorney_id=payload.responsible_attorney_id, opposing_party=payload.opposing_party or "", status=payload.status or "open", filed_date=payload.filed_date, next_session_date=payload.next_session_date)
    _cases[cid] = case
    return case

@router.get("/cases", response_model=List[Case])
async def list_cases():
    return list(_cases.values())

@router.get("/cases/{case_id}", response_model=Case)
async def get_case(case_id: str):
    c = _cases.get(case_id)
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    return c
