"""add saldo_usd, saldo_activo to bot_config

Revision ID: 8a1f2c9e3b4d
Revises: 472df8067622
Create Date: 2026-09-26 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8a1f2c9e3b4d'
down_revision: Union[str, Sequence[str], None] = '472df8067622'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('bot_config', sa.Column('saldo_usd', sa.Numeric(10, 4), server_default='0', nullable=False))
    op.add_column('bot_config', sa.Column('saldo_activo', sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('bot_config', 'saldo_activo')
    op.drop_column('bot_config', 'saldo_usd')
