"""Add auth roles and is_active to users

Revision ID: 64d30026f6ee
Revises: 4a6167ea2e1e
Create Date: 2026-09-07 09:22:19.967992

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '64d30026f6ee'
down_revision: Union[str, Sequence[str], None] = '4a6167ea2e1e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=True, server_default='1'))


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('is_active')
