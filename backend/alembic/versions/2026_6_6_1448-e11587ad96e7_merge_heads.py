"""merge heads

Revision ID: e11587ad96e7
Revises: 2026_6_3_1030_add_is_visible, 2026_6_3_1100_calc_col_props
Create Date: 2026-06-06 14:48:50.407090

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e11587ad96e7'
down_revision: Union[str, None] = ('2026_6_3_1030_add_is_visible', '2026_6_3_1100_calc_col_props')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
