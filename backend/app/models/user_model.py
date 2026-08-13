from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_number = Column(String(128), index=True, nullable=False)
    case_title = Column(String(512), nullable=False)
    case_type = Column(String(128), nullable=True)
    court_level = Column(String(128), nullable=True)
    court_name = Column(String(256), nullable=True)
    subject = Column(Text, nullable=True)
    client_id = Column(String(64), nullable=True)
    responsible_attorney_id = Column(String(64), nullable=True)
    opposing_party = Column(String(512), nullable=True)
    status = Column(String(64), nullable=True, index=True)
    filed_date = Column(String(64), nullable=True)
    next_session_date = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class CourtSession(Base):
    __tablename__ = "court_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False)
    session_date = Column(String(64), nullable=False)
    session_time = Column(String(64), nullable=True)
    court_name = Column(String(256), nullable=True)
    circuit = Column(String(128), nullable=True)
    session_type = Column(String(128), nullable=True)
    attendees_plaintiff = Column(Boolean, default=False)
    attendees_defendant = Column(Boolean, default=False)
    documents_submitted = Column(Text, nullable=True)
    requests_submitted = Column(Text, nullable=True)
    defenses_submitted = Column(Text, nullable=True)
    memos_submitted = Column(Text, nullable=True)
    court_decision = Column(Text, nullable=True)
    ruling_text = Column(Text, nullable=True)
    status = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    case = relationship("Case", backref="sessions")

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(256), nullable=False)
    full_name = Column(String(256), nullable=True)
    email = Column(String(256), nullable=True)
    disabled = Column(Boolean, nullable=False, server_default='false')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
