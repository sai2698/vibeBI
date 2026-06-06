import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def add_column():
    engine = create_async_engine("postgresql+asyncpg://postgres:password@localhost:5432/bi_platform")
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE datasets ADD COLUMN lob_id INTEGER REFERENCES lines_of_business(id);"))
            print("Successfully added lob_id column to datasets table.")
        except Exception as e:
            print(f"Error: {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(add_column())
