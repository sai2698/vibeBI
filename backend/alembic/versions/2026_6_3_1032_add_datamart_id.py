"""add datamart id to saved queries

Revision ID: 2026_6_3_1032_add_datamart_id
Revises: 2026_6_3_1031_add_query_config
Create Date: 2026-06-03 10:32:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_6_3_1032_add_datamart_id'
down_revision: Union[str, None] = '2026_6_3_1031_add_query_config'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('saved_queries', sa.Column('datamart_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_saved_queries_datamart', 'saved_queries', 'datamarts', ['datamart_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_saved_queries_datamart', 'saved_queries', type_='foreignkey')
    op.drop_column('saved_queries', 'datamart_id')
