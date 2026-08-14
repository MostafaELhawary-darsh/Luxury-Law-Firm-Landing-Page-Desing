"""create audit_logs table

Revision ID: 0001_create_audit_logs
Revises: 
Create Date: 2026-08-13 23:45:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0001_create_audit_logs'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Ensure pgcrypto or uuid-ossp extension is available for uuid generation if desired
    # op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('resource', sa.String(length=128), nullable=False),
        sa.Column('resource_id', sa.String(length=64), nullable=True),
        sa.Column('actor', sa.String(length=128), nullable=True),
        sa.Column('details', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_resource_id'), 'audit_logs', ['resource_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_audit_logs_resource_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_table('audit_logs')
