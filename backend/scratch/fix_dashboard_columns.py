import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Adding background_color column...")
        await conn.execute(text("ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS background_color VARCHAR(20) DEFAULT '#f8fafc'"))
        print("Adding logo_url column...")
        await conn.execute(text("ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS logo_url VARCHAR(512)"))
        print("Adding grid_gap column...")
        await conn.execute(text("ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS grid_gap INTEGER DEFAULT 16"))
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
