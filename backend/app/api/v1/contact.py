from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Dict
from datetime import datetime

router = APIRouter()

# Simple in-memory store for contact requests (scaffold)
CONTACT_STORE: Dict[str, dict] = {}

class ContactRequest(BaseModel):
    name: str
    email: EmailStr

class ContactResponse(BaseModel):
    id: str
    received_at: datetime

@router.post("/contact", response_model=ContactResponse)
async def submit_contact(payload: ContactRequest):
    # In a production system this would persist to Postgres / Supabase
    id = str(len(CONTACT_STORE) + 1)
    entry = {"id": id, "name": payload.name, "email": payload.email, "received_at": datetime.utcnow().isoformat()}
    CONTACT_STORE[id] = entry
    return {"id": id, "received_at": datetime.utcnow()}
