"""add filterable and visible to calculated columns

Revision ID: 2026_6_3_1100_calc_col_props
Revises: 2026_6_3_1045_calc_cols
Create Date: 2026-06-03 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_6_3_1100_calc_col_props'
down_revision: Union[str, None] = '2026_6_3_1045_calc_cols'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add is_filterable and is_visible columns to dataset_calculated_columns."""
    op.add_column('dataset_calculated_columns', sa.Column('is_filterable', sa.Boolean(), nullable=True, default=True))
    op.add_column('dataset_calculated_columns', sa.Column('is_visible', sa.Boolean(), nullable=True, default=True))
    
    # Set default values for existing rows
    op.execute("UPDATE dataset_calculated_columns SET is_filterable = TRUE WHERE is_filterable IS NULL")
    op.execute("UPDATE dataset_calculated_columns SET is_visible = TRUE WHERE is_visible IS NULL")
    
    # Alter columns to be NOT NULL
    op.alter_column('dataset_calculated_columns', 'is_filterable', nullable=False)
    op.alter_column('dataset_calculated_columns', 'is_visible', nullable=False)


def downgrade() -> None:
    """Remove is_filterable and is_visible columns from dataset_calculated_columns."""
    op.drop_column('dataset_calculated_columns', 'is_visible')
    op.drop_column('dataset_calculated_columns', 'is_filterable')
