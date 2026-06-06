import asyncio
from app.database import engine
from app.models import DashboardOwner

async def create_table():
    async with engine.begin() as conn:
        await conn.run_sync(DashboardOwner.__table__.create, checkfirst=True)
    print("DashboardOwner table created successfully")

if __name__ == "__main__":
    asyncio.run(create_table())
