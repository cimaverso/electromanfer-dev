"""add bot_config, bot_chats_desactivados, bot_uso_ia tables

Revision ID: 472df8067622
Revises: a1c9f3d07e21
Create Date: 2026-09-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '472df8067622'
down_revision: Union[str, Sequence[str], None] = 'a1c9f3d07e21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Reproduce exacto el horario hardcodeado que tenía
# app/integrations/bot/schedule.py antes de esta migración: lunes a
# viernes activo 18:00-06:00(día siguiente); sábado activo desde 14:00
# continuo todo el domingo hasta las 06:00 del lunes. Cada día lleva sus
# propios tramos dentro del mismo día calendario (sin cruzar medianoche).
HORARIO_DEFAULT = {
    "0": [["00:00", "06:00"], ["18:00", "24:00"]],  # lunes
    "1": [["00:00", "06:00"], ["18:00", "24:00"]],  # martes
    "2": [["00:00", "06:00"], ["18:00", "24:00"]],  # miércoles
    "3": [["00:00", "06:00"], ["18:00", "24:00"]],  # jueves
    "4": [["00:00", "06:00"], ["18:00", "24:00"]],  # viernes
    "5": [["00:00", "06:00"], ["14:00", "24:00"]],  # sábado
    "6": [["00:00", "24:00"]],                       # domingo
}


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'bot_config',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('override_manual', sa.String(length=3), nullable=True),
        sa.Column('horario_activo', sa.Boolean(), nullable=False),
        sa.Column('horario_reglas', sa.JSON(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('actualizado_por_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['actualizado_por_id'], ['usuarios.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'bot_chats_desactivados',
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('desactivado_por_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['desactivado_por_id'], ['usuarios.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('conversation_id'),
    )

    op.create_table(
        'bot_uso_ia',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('phone_number_id', sa.String(length=64), nullable=False),
        sa.Column('modelo', sa.String(length=64), nullable=False),
        sa.Column('tokens_entrada', sa.Integer(), nullable=False),
        sa.Column('tokens_salida', sa.Integer(), nullable=False),
        sa.Column('costo_usd', sa.Numeric(10, 6), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_bot_uso_ia_created_at', 'bot_uso_ia', ['created_at'])

    bot_config = sa.table(
        'bot_config',
        sa.column('id', sa.Integer),
        sa.column('override_manual', sa.String),
        sa.column('horario_activo', sa.Boolean),
        sa.column('horario_reglas', sa.JSON),
    )
    op.bulk_insert(bot_config, [{
        'id': 1,
        'override_manual': None,
        'horario_activo': True,
        'horario_reglas': HORARIO_DEFAULT,
    }])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_bot_uso_ia_created_at', table_name='bot_uso_ia')
    op.drop_table('bot_uso_ia')
    op.drop_table('bot_chats_desactivados')
    op.drop_table('bot_config')
