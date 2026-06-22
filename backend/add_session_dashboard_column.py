import asyncio
from app.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        print("Adding dashboard_id column to ai_chat_sessions...")
        await conn.execute(text("""
            ALTER TABLE ai_chat_sessions 
            ADD COLUMN IF NOT EXISTS dashboard_id INTEGER 
            REFERENCES dashboards(id) ON DELETE SET NULL
        """))
        print("Column added successfully!")

if __name__ == "__main__":
    asyncio.run(main())
