"""initial migration

Revision ID: 0001_initial
Revises: 
Create Date: 2026-08-13 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as pg

# revision identifiers, used by Alembic.
revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', pg.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('username', sa.String(length=150), nullable=False),
        sa.Column('hashed_password', sa.String(length=256), nullable=False),
        sa.Column('full_name', sa.String(length=256), nullable=True),
        sa.Column('email', sa.String(length=256), nullable=True),
        sa.Column('disabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    op.create_table(
        'cases',
        sa.Column('id', pg.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('case_number', sa.String(length=128), nullable=False),
        sa.Column('case_title', sa.String(length=512), nullable=False),
        sa.Column('case_type', sa.String(length=128), nullable=True),
        sa.Column('court_level', sa.String(length=128), nullable=True),
        sa.Column('court_name', sa.String(length=256), nullable=True),
        sa.Column('subject', sa.Text(), nullable=True),
        sa.Column('client_id', sa.String(length=64), nullable=True),
        sa.Column('responsible_attorney_id', sa.String(length=64), nullable=True),
        sa.Column('opposing_party', sa.String(length=512), nullable=True),
        sa.Column('status', sa.String(length=64), nullable=True),
        sa.Column('filed_date', sa.String(length=64), nullable=True),
        sa.Column('next_session_date', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_cases_case_number'), 'cases', ['case_number'], unique=False)

    op.create_table(
        'court_sessions',
        sa.Column('id', pg.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('case_id', pg.UUID(as_uuid=True), sa.ForeignKey('cases.id'), nullable=False),
        sa.Column('session_date', sa.String(length=64), nullable=False),
        sa.Column('session_time', sa.String(length=64), nullable=True),
        sa.Column('court_name', sa.String(length=256), nullable=True),
        sa.Column('circuit', sa.String(length=128), nullable=True),
        sa.Column('session_type', sa.String(length=128), nullable=True),
        sa.Column('attendees_plaintiff', sa.Boolean(), nullable=True, server_default=sa.text('false')),
        sa.Column('attendees_defendant', sa.Boolean(), nullable=True, server_default=sa.text('false')),
        sa.Column('documents_submitted', sa.Text(), nullable=True),
        sa.Column('requests_submitted', sa.Text(), nullable=True),
        sa.Column('defenses_submitted', sa.Text(), nullable=True),
        sa.Column('memos_submitted', sa.Text(), nullable=True),
        sa.Column('court_decision', sa.Text(), nullable=True),
        sa.Column('ruling_text', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )


def downgrade() -> None:
    op.drop_table('court_sessions')
    op.drop_index(op.f('ix_cases_case_number'), table_name='cases')
    op.drop_table('cases')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_table('users')
