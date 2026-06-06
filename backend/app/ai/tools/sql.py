from typing import Dict, Any, List
from .base import BaseTool

async def get_dataset_schemas_summary(dataset_ids: list) -> str:
    from app.database import AsyncSessionLocal
    from app.models import Dataset
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    
    if not dataset_ids:
        return ""
        
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(Dataset)
            .where(Dataset.id.in_(dataset_ids))
            .options(selectinload(Dataset.columns), selectinload(Dataset.calculated_columns))
        )
        datasets = res.scalars().all()
        
        summary = "\n### Available Enterprise Database Tables & Columns:\n"
        for ds in datasets:
            table_ref = ds.table_name or f"(Custom SQL: {ds.custom_sql})"
            summary += f"- Table: `{table_ref}` (Dataset: {ds.name})\n"
            summary += "  Columns:\n"
            for col in ds.columns:
                summary += f"    - `{col.column_name}` ({col.data_type or 'unknown'})\n"
        return summary

async def run_sql_query_on_dataset(dataset_ids: list, sql: str, user_email: str = None) -> str:
    from app.database import AsyncSessionLocal
    from app.models import Dataset, Datasource
    from app.charts.utils import get_sync_uri
    from app.datasources.pool import ds_pool
    import pandas as pd
    from starlette.concurrency import run_in_threadpool
    from sqlalchemy import text, select
    
    if not dataset_ids:
        return "Error: No datasets linked to this bot's knowledge config."
        
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(Dataset).where(Dataset.id.in_(dataset_ids))
        )
        dataset = res.scalars().first()
        if not dataset:
            return "Error: Dataset not found."
            
        res_ds = await db.execute(
            select(Datasource).where(Datasource.id == dataset.datasource_id)
        )
        datasource = res_ds.scalar_one_or_none()
        if not datasource:
            return "Error: Datasource connected to dataset not found."
            
        try:
            impersonate = datasource.advanced_properties.get("impersonate_user", False) if datasource.advanced_properties else False
            engine = ds_pool.get_engine(get_sync_uri(datasource.connection_uri), user_email if impersonate else None)
            df = await run_in_threadpool(pd.read_sql_query, text(sql), engine)
            if df.empty:
                return "Query returned 0 rows."
            df_limited = df.head(50)
            md_table = df_limited.to_markdown(index=False)
            if len(df) > 50:
                md_table += f"\n\n*(Truncated: showing first 50 rows of {len(df)} total rows)*"
            return md_table
        except Exception as e:
            return f"SQL Error: {str(e)}"

class RunSQLTool(BaseTool):
    name = "run_sql_query"
    description = "Run a SQL query against the connected enterprise database to retrieve exact data or aggregations. MUST return markdown format. Do not use this for destructive operations."
    parameters = {
        "type": "object",
        "properties": {
            "sql": {
                "type": "string",
                "description": "The exact SQL query to run. E.g., SELECT * FROM users LIMIT 10"
            }
        },
        "required": ["sql"]
    }

    def __init__(self, dataset_ids: List[int], user_email: str = None):
        self.dataset_ids = dataset_ids
        self.user_email = user_email

    async def execute(self, sql: str) -> str:
        return await run_sql_query_on_dataset(self.dataset_ids, sql, self.user_email)
