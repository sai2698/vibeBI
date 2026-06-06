import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.begin() as conn:
        print("Adding echarts_theme column to dashboards table...")
        try:
            await conn.execute(text("ALTER TABLE dashboards ADD COLUMN echarts_theme VARCHAR(50) DEFAULT 'default'"))
            print("Successfully added echarts_theme column!")
        except Exception as e:
            print("Failed or column already exists:", e)

if __name__ == "__main__":
    asyncio.run(main())
