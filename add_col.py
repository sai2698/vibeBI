import asyncio
import sys
sys.path.append('.')
from backend.app.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS icon_color VARCHAR(20)'))
        print('DONE')

asyncio.run(main())
