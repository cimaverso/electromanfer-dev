"""add lineas_encendidas to bot_config (encendido manual por línea)

Revision ID: e7c2a9d4b1f3
Revises: d4f8b1a6c2e9
Create Date: 2026-09-28 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e7c2a9d4b1f3'
down_revision: Union[str, Sequence[str], None] = 'd4f8b1a6c2e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('bot_config', sa.Column('lineas_encendidas', sa.JSON(), server_default='[]', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('bot_config', 'lineas_encendidas')
