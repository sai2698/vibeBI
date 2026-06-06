import asyncio
import sys
sys.path.append('.')
from backend.app.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS title_font_size INTEGER DEFAULT 15'))
        await conn.execute(text('ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS subtitle_font_size INTEGER DEFAULT 10'))
        await conn.execute(text('ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS logo_size VARCHAR(20) DEFAULT \'medium\''))
        print('DONE')

asyncio.run(main())
