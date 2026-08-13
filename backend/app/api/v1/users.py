from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user_model import User as UserModel
from passlib.context import CryptContext
from uuid import uuid4

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str | None = None
    email: str | None = None

class UserOut(BaseModel):
    id: str
    username: str
    full_name: str | None = None
    email: str | None = None

@router.post("/users", response_model=UserOut)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    q = await db.execute(select(UserModel).where(UserModel.username == payload.username))
    existing = q.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="username already exists")
    hashed = pwd_context.hash(payload.password)
    u = UserModel(id=str(uuid4()), username=payload.username, hashed_password=hashed, full_name=payload.full_name, email=payload.email)
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return UserOut(id=str(u.id), username=u.username, full_name=u.full_name, email=u.email)
