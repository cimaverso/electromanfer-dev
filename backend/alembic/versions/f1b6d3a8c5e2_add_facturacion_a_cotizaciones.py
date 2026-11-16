"""add numero_factura y fecha_facturacion a cotizaciones

Revision ID: f1b6d3a8c5e2
Revises: c5d8e1a4f702
Create Date: 2026-11-14 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1b6d3a8c5e2'
down_revision: Union[str, Sequence[str], None] = 'c5d8e1a4f702'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cotizaciones', sa.Column('numero_factura', sa.String(length=50), nullable=True))
    op.add_column('cotizaciones', sa.Column('fecha_facturacion', sa.DateTime(), nullable=True))
    # Siasoft consulta solo las facturadas, ordenadas por id y por updated_at.
    op.create_index('ix_cotizaciones_facturadas', 'cotizaciones', ['updated_at'],
                    postgresql_where=sa.text("estado = 'facturada'"))


def downgrade() -> None:
    op.drop_index('ix_cotizaciones_facturadas', table_name='cotizaciones')
    op.drop_column('cotizaciones', 'fecha_facturacion')
    op.drop_column('cotizaciones', 'numero_factura')
