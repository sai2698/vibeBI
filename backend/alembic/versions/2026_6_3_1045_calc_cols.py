"""add calculated columns to datasets

Revision ID: 2026_6_3_1045_calc_cols
Revises: 318d13f5de81
Create Date: 2026-06-03 10:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_6_3_1045_calc_cols'
down_revision: Union[str, None] = '318d13f5de81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade database schema to add calculated columns table."""
    op.create_table(
        'dataset_calculated_columns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dataset_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('friendly_name', sa.String(length=200), nullable=True),
        sa.Column('expression', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('data_type', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['dataset_id'], ['datasets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_dataset_calculated_columns_id'), 'dataset_calculated_columns', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade database schema by dropping calculated columns table."""
    op.drop_index(op.f('ix_dataset_calculated_columns_id'), table_name='dataset_calculated_columns')
    op.drop_table('dataset_calculated_columns')
