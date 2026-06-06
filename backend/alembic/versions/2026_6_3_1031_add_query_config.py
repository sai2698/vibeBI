"""add query config to saved queries

Revision ID: 2026_6_3_1031_add_query_config
Revises: 318d13f5de81
Create Date: 2026-06-03 10:31:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = '2026_6_3_1031_add_query_config'
down_revision: Union[str, None] = '318d13f5de81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('saved_queries', sa.Column('query_config', JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column('saved_queries', 'query_config')
