"""add lineas_apagadas to bot_config, drop override_manual

Revision ID: b3e7a2c9f1d4
Revises: 9c4d6e1f7a2b
Create Date: 2026-09-26 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3e7a2c9f1d4'
down_revision: Union[str, Sequence[str], None] = '9c4d6e1f7a2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('bot_config', sa.Column('lineas_apagadas', sa.JSON(), server_default='[]', nullable=False))

    bot_config = sa.table(
        'bot_config',
        sa.column('id', sa.Integer),
        sa.column('override_manual', sa.String(3)),
        sa.column('lineas_apagadas', sa.JSON),
    )
    conn = op.get_bind()
    fila = conn.execute(sa.select(bot_config.c.id, bot_config.c.override_manual).where(bot_config.c.id == 1)).first()
    if fila is not None and fila.override_manual == 'off':
        conn.execute(bot_config.update().where(bot_config.c.id == 1).values(lineas_apagadas=['7', '8']))

    op.drop_column('bot_config', 'override_manual')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('bot_config', sa.Column('override_manual', sa.String(3), nullable=True))

    bot_config = sa.table(
        'bot_config',
        sa.column('id', sa.Integer),
        sa.column('override_manual', sa.String(3)),
        sa.column('lineas_apagadas', sa.JSON),
    )
    conn = op.get_bind()
    fila = conn.execute(sa.select(bot_config.c.id, bot_config.c.lineas_apagadas).where(bot_config.c.id == 1)).first()
    if fila is not None and fila.lineas_apagadas:
        conn.execute(bot_config.update().where(bot_config.c.id == 1).values(override_manual='off'))

    op.drop_column('bot_config', 'lineas_apagadas')
