import asyncio
from app.database import engine, Base
from app.models import DashboardRole, DashboardFavorite

async def sync_db():
    async with engine.begin() as conn:
        # This will create missing tables
        await conn.run_sync(Base.metadata.create_all)
    print("Database sync complete.")

if __name__ == "__main__":
    asyncio.run(sync_db())
