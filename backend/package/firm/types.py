from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

# Core simplified models converted from src/lib/firmTypes.ts

class CaseBase(BaseModel):
    case_number: Optional[str]
    case_title: Optional[str]
    case_type: Optional[str]
    court_level: Optional[str]
    court_name: Optional[str]
    subject: Optional[str]
    client_id: Optional[str]
    responsible_attorney_id: Optional[str]
    opposing_party: Optional[str]
    status: Optional[str]
    filed_date: Optional[str]
    next_session_date: Optional[str]

class CaseCreate(CaseBase):
    case_title: str

class Case(CaseBase):
    id: str
    client: Optional[Dict[str, Any]] = None
    attorney: Optional[Dict[str, Any]] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "uuid",
                "case_number": "2026/001",
                "case_title": "Acme vs. State",
                "case_type": "civil",
                "court_level": "high",
            }
        }
    }

# The rest of the previously converted models remain in this file in the branch (initial subset)
