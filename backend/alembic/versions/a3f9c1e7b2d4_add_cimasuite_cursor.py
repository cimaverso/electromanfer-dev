"""add cimasuite_cursor (último evento de CimaSuite procesado)

Revision ID: a3f9c1e7b2d4
Revises: e7c2a9d4b1f3
Create Date: 2026-10-06 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a3f9c1e7b2d4'
down_revision: Union[str, Sequence[str], None] = 'e7c2a9d4b1f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # main.py hace create_all al arrancar: si el deploy llegó antes que esta
    # migración, la tabla ya existe y no hay nada que hacer.
    if sa.inspect(op.get_bind()).has_table('cimasuite_cursor'):
        return
    op.create_table(
        'cimasuite_cursor',
        sa.Column('id', sa.SmallInteger(), nullable=False),
        sa.Column('ultimo_evento_id', sa.String(length=32), nullable=False),
        sa.Column('actualizado_en', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('cimasuite_cursor')
