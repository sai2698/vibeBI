import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE dashboards ADD COLUMN filter_presets JSONB DEFAULT '[]'::jsonb;"))
            print("Successfully added filter_presets column to dashboards table.")
        except Exception as e:
            print(f"Error (column might already exist): {e}")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
