import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.begin() as conn:
        print("Adding pages column to dashboards table...")
        try:
            await conn.execute(text("ALTER TABLE dashboards ADD COLUMN pages JSONB DEFAULT '[]'::jsonb"))
            print("Successfully added pages column!")
        except Exception as e:
            print("Failed or column already exists:", e)

if __name__ == "__main__":
    asyncio.run(main())
