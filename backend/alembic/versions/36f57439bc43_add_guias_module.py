"""add_guias_module

Revision ID: 36f57439bc43
Revises: 5a9351906486
Create Date: 2026-06-22 14:18:49.632930

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '36f57439bc43'
down_revision: Union[str, Sequence[str], None] = '5a9351906486'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Las tablas transportadoras, guias y guias_historial ya existen en la BD
    # creadas manualmente antes de esta migración.
    # Solo aseguramos activa con default y la semilla.
    op.execute("""
        ALTER TABLE transportadoras ALTER COLUMN activa SET DEFAULT TRUE
    """)
    op.execute("""
        INSERT INTO transportadoras (nombre, activa) VALUES
            ('Coordinadora', TRUE), ('Interrapidísimo', TRUE), ('Encoexpres', TRUE),
            ('Envia', TRUE), ('Servientrega', TRUE), ('TCC', TRUE)
        ON CONFLICT (nombre) DO NOTHING
    """)
    # Agregar costo_flete si no existe (campo nuevo según el doc)
    op.execute("""
        ALTER TABLE guias ADD COLUMN IF NOT EXISTS costo_flete NUMERIC(15,2)
    """)


def downgrade() -> None:
    pass