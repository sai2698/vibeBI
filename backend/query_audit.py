import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

async def run():
    engine = create_async_engine("postgresql+asyncpg://navya:navya123@localhost/navya_db")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        result = await session.execute(text("SELECT details FROM audit_logs WHERE action='execute_chart' AND details->>'status' = 'error' ORDER BY created_at DESC LIMIT 1;"))
        row = result.fetchone()
        if row:
            print("Last error:", row[0])
        else:
            print("No error found in audit log.")

asyncio.run(run())
