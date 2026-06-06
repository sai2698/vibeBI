import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import Datasource
from app.config import settings

async def add_test_datasource():
    engine = create_async_engine(settings.DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # Check if already exists
        from sqlalchemy import select
        result = await session.execute(select(Datasource).where(Datasource.name == "BI Platform Database"))
        if result.scalar_one_or_none():
            print("Datasource already exists")
            return

        ds = Datasource(
            name="BI Platform Database",
            engine="postgresql",
            connection_uri="postgresql://postgres:password@localhost:5432/bi_platform"
        )
        session.add(ds)
        await session.commit()
        print("Successfully added 'BI Platform Database' as a datasource.")

if __name__ == "__main__":
    asyncio.run(add_test_datasource())
