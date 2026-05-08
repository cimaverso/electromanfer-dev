"""rename_firmas_archivo_to_url

Revision ID: 247269bf6e74
Revises: b649a638bd30
Create Date: 2026-05-07 18:29:42.391030

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '247269bf6e74'
down_revision: Union[str, Sequence[str], None] = 'b649a638bd30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.alter_column('firmas', 'archivo', new_column_name='url')

def downgrade():
    op.alter_column('firmas', 'url', new_column_name='archivo')