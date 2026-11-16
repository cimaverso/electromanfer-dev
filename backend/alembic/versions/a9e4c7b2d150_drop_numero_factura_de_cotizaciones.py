"""drop numero_factura de cotizaciones (no se usa: las facturas las revisa Electromanfer en Siasoft)

Revision ID: a9e4c7b2d150
Revises: f1b6d3a8c5e2
Create Date: 2026-11-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a9e4c7b2d150'
down_revision: Union[str, Sequence[str], None] = 'f1b6d3a8c5e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('cotizaciones', 'numero_factura')


def downgrade() -> None:
    op.add_column('cotizaciones', sa.Column('numero_factura', sa.String(length=50), nullable=True))
