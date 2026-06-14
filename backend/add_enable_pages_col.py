import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    database_url = os.getenv("DATABASE_URL")
    if database_url and database_url.startswith("postgresql+asyncpg://"):
        database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
        
    conn = await asyncpg.connect(database_url)
    try:
        await conn.execute('ALTER TABLE dashboards ADD COLUMN enable_pages BOOLEAN DEFAULT FALSE;')
        print("Column 'enable_pages' added successfully.")
    except Exception as e:
        print(f"Error or column already exists: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
