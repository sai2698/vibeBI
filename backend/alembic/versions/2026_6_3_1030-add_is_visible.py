"""add is_visible to dataset_columns

Revision ID: 2026_6_3_1030-add_is_visible
Revises: 318d13f5de81
Create Date: 2026-06-03 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_6_3_1030_add_is_visible'
down_revision: Union[str, None] = '2026_6_3_1032_add_datamart_id'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('dataset_columns', sa.Column('is_visible', sa.Boolean(), nullable=True, server_default='true'))


def downgrade() -> None:
    op.drop_column('dataset_columns', 'is_visible')
