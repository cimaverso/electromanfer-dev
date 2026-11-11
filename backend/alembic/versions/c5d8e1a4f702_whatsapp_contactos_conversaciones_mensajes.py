"""whatsapp_contactos, whatsapp_conversaciones y whatsapp_mensajes: el chat de WhatsApp en Electromanfer

Revision ID: c5d8e1a4f702
Revises: a3f9c1e7b2d4
Create Date: 2026-11-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c5d8e1a4f702'
down_revision: Union[str, Sequence[str], None] = 'a3f9c1e7b2d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # La búsqueda por contenido usa índices de trigramas.
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.create_table(
        'whatsapp_contactos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('telefono', sa.String(length=30), nullable=False),
        sa.Column('nombre', sa.String(length=200), nullable=True),
        sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('actualizado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('telefono'),
    )
    op.create_table(
        'whatsapp_conversaciones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('contacto_id', sa.Integer(), nullable=False),
        sa.Column('phone_number_id', sa.Integer(), nullable=False),
        sa.Column('is_pinned', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_muted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_archived', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_priority', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('vaciada_hasta', sa.DateTime(timezone=True), nullable=True),
        sa.Column('eliminada', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('ultimo_mensaje_id', sa.BigInteger(), nullable=True),
        sa.Column('ultimo_mensaje_en', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ultimo_entrante_en', sa.DateTime(timezone=True), nullable=True),
        sa.Column('no_leidos', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['contacto_id'], ['whatsapp_contactos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('contacto_id', 'phone_number_id', name='uq_whatsapp_conversacion_contacto_linea'),
    )
    op.create_index('ix_whatsapp_conversacion_linea_ultimo', 'whatsapp_conversaciones',
                    ['phone_number_id', 'ultimo_mensaje_en'])
    op.create_table(
        'whatsapp_mensajes',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('conversacion_id', sa.Integer(), nullable=False),
        sa.Column('whatsapp_message_id', sa.String(length=128), nullable=True),
        sa.Column('cimasuite_mensaje_id', sa.BigInteger(), nullable=True),
        sa.Column('direccion', sa.String(length=10), nullable=False),
        sa.Column('tipo', sa.String(length=20), server_default=sa.text("'text'"), nullable=False),
        sa.Column('contenido', sa.Text(), nullable=True),
        sa.Column('datos', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('media_id', sa.String(length=128), nullable=True),
        sa.Column('media_nombre', sa.String(length=255), nullable=True),
        sa.Column('media_mime', sa.String(length=100), nullable=True),
        sa.Column('media_clave', sa.String(length=512), nullable=True),
        sa.Column('plantilla_nombre', sa.String(length=512), nullable=True),
        sa.Column('plantilla_componentes', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('estado', sa.String(length=20), nullable=True),
        sa.Column('error', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('leido_en', sa.DateTime(timezone=True), nullable=True),
        sa.Column('enviado_por_usuario_id', sa.Integer(), nullable=True),
        sa.Column('enviado_por_bot', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['conversacion_id'], ['whatsapp_conversaciones.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['enviado_por_usuario_id'], ['usuarios.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_whatsapp_mensaje_conv_creado', 'whatsapp_mensajes', ['conversacion_id', 'creado_en'])
    op.create_index('uq_whatsapp_mensaje_wamid', 'whatsapp_mensajes', ['whatsapp_message_id'], unique=True,
                    postgresql_where=sa.text('whatsapp_message_id IS NOT NULL'))
    op.create_index('uq_whatsapp_mensaje_cimasuite', 'whatsapp_mensajes', ['cimasuite_mensaje_id'], unique=True,
                    postgresql_where=sa.text('cimasuite_mensaje_id IS NOT NULL'))
    op.create_index('ix_whatsapp_mensaje_conv_media', 'whatsapp_mensajes', ['conversacion_id', 'creado_en'],
                    postgresql_where=sa.text('media_id IS NOT NULL'))
    op.create_index('ix_whatsapp_mensaje_contenido_trgm', 'whatsapp_mensajes', ['contenido'],
                    postgresql_using='gin', postgresql_ops={'contenido': 'gin_trgm_ops'})
    # El último mensaje apunta a la tabla de mensajes, que se crea después: la clave va al final.
    op.create_foreign_key('fk_whatsapp_conversacion_ultimo_mensaje', 'whatsapp_conversaciones',
                          'whatsapp_mensajes', ['ultimo_mensaje_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('fk_whatsapp_conversacion_ultimo_mensaje', 'whatsapp_conversaciones', type_='foreignkey')
    op.drop_table('whatsapp_mensajes')
    op.drop_index('ix_whatsapp_conversacion_linea_ultimo', table_name='whatsapp_conversaciones')
    op.drop_table('whatsapp_conversaciones')
    op.drop_table('whatsapp_contactos')
