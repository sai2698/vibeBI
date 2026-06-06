import asyncio
from sqlalchemy import text
from app.database import engine

async def rename_column():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE datasets RENAME COLUMN schema_json TO schema_metadata;"))
    print("Column renamed successfully")

if __name__ == "__main__":
    asyncio.run(rename_column())
