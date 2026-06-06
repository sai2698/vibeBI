import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_schema():
    engine = create_async_engine("postgresql+asyncpg://postgres:password@localhost:5432/bi_platform")
    async with engine.begin() as conn:
        for table in ["dashboards", "charts"]:
            try:
                await conn.execute(text(f"SELECT lob_id FROM {table} LIMIT 0"))
                print(f"Table '{table}' has lob_id.")
            except Exception as e:
                print(f"Table '{table}' is MISSING lob_id. Error: {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_schema())
