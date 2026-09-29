"""Add NVIDIA AI fields to assessments table

Revision ID: b2f8a7e4c1d9
Revises: 64d30026f6ee
Create Date: 2026-09-29 17:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2f8a7e4c1d9'
down_revision: Union[str, Sequence[str], None] = '64d30026f6ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('assessments') as batch_op:
        batch_op.add_column(sa.Column('ai_explanation', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('ai_summary', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('ai_insights', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('ai_provider', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('ai_model', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('ai_generated_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('assessments') as batch_op:
        batch_op.drop_column('ai_generated_at')
        batch_op.drop_column('ai_model')
        batch_op.drop_column('ai_provider')
        batch_op.drop_column('ai_insights')
        batch_op.drop_column('ai_summary')
        batch_op.drop_column('ai_explanation')
