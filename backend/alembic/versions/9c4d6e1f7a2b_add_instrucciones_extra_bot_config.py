"""add instrucciones_extra to bot_config

Revision ID: 9c4d6e1f7a2b
Revises: 8a1f2c9e3b4d
Create Date: 2026-09-26 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '9c4d6e1f7a2b'
down_revision: Union[str, Sequence[str], None] = '8a1f2c9e3b4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('bot_config', sa.Column('instrucciones_extra', sa.Text(), server_default='', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('bot_config', 'instrucciones_extra')
