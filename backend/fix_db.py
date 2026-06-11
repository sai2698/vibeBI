import asyncio
import sys
sys.path.insert(0, '/home/naveen/NAVYA/backend')
from app.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE dataset_metrics ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;'))

asyncio.run(main())
