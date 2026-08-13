"""Initial database schema

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('username', sa.String(150), nullable=False),
        sa.Column('hashed_password', sa.String(256), nullable=False),
        sa.Column('full_name', sa.String(256), nullable=True),
        sa.Column('email', sa.String(256), nullable=True),
        sa.Column('disabled', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id', name='pk_users'),
        sa.UniqueConstraint('username', name='uq_users_username')
    )
    op.create_index('ix_users_username', 'users', ['username'])
    
    # Create cases table
    op.create_table(
        'cases',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('case_number', sa.String(128), nullable=False),
        sa.Column('case_title', sa.String(512), nullable=False),
        sa.Column('case_type', sa.String(128), nullable=True),
        sa.Column('court_level', sa.String(128), nullable=True),
        sa.Column('court_name', sa.String(256), nullable=True),
        sa.Column('subject', sa.Text(), nullable=True),
        sa.Column('client_id', sa.String(64), nullable=True),
        sa.Column('responsible_attorney_id', sa.String(64), nullable=True),
        sa.Column('opposing_party', sa.String(512), nullable=True),
        sa.Column('status', sa.String(64), nullable=True),
        sa.Column('filed_date', sa.String(64), nullable=True),
        sa.Column('next_session_date', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id', name='pk_cases')
    )
    op.create_index('ix_cases_case_number', 'cases', ['case_number'])
    op.create_index('ix_cases_status', 'cases', ['status'])
    
    # Create court_sessions table
    op.create_table(
        'court_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('case_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_date', sa.String(64), nullable=False),
        sa.Column('session_time', sa.String(64), nullable=True),
        sa.Column('court_name', sa.String(256), nullable=True),
        sa.Column('circuit', sa.String(128), nullable=True),
        sa.Column('session_type', sa.String(128), nullable=True),
        sa.Column('attendees_plaintiff', sa.Boolean(), default=False),
        sa.Column('attendees_defendant', sa.Boolean(), default=False),
        sa.Column('documents_submitted', sa.Text(), nullable=True),
        sa.Column('requests_submitted', sa.Text(), nullable=True),
        sa.Column('defenses_submitted', sa.Text(), nullable=True),
        sa.Column('memos_submitted', sa.Text(), nullable=True),
        sa.Column('court_decision', sa.Text(), nullable=True),
        sa.Column('ruling_text', sa.Text(), nullable=True),
        sa.Column('status', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], name='fk_court_sessions_case_id_cases'),
        sa.PrimaryKeyConstraint('id', name='pk_court_sessions')
    )

def downgrade() -> None:
    op.drop_table('court_sessions')
    op.drop_table('cases')
    op.drop_table('users')
