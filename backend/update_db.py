import asyncio
from app.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE ai_chat_messages ADD COLUMN reasoning_content TEXT"))
        await conn.execute(text("ALTER TABLE ai_chat_messages ADD COLUMN tool_calls JSONB"))
        await conn.execute(text("ALTER TABLE ai_chat_messages ADD COLUMN tool_results JSONB"))

asyncio.run(main())
