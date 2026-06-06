import asyncio
from sqlalchemy import text
from app.database import engine

async def drop_slug_column():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE lines_of_business DROP COLUMN IF EXISTS slug CASCADE;"))
    print("Slug column dropped successfully from lines_of_business")

if __name__ == "__main__":
    asyncio.run(drop_slug_column())
