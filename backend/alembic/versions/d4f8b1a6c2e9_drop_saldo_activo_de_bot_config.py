"""drop saldo_activo from bot_config (apagado por saldo ahora es siempre obligatorio)

Revision ID: d4f8b1a6c2e9
Revises: b3e7a2c9f1d4
Create Date: 2026-09-26 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4f8b1a6c2e9'
down_revision: Union[str, Sequence[str], None] = 'b3e7a2c9f1d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column('bot_config', 'saldo_activo')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('bot_config', sa.Column('saldo_activo', sa.Boolean(), server_default=sa.false(), nullable=False))
