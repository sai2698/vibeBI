import asyncio
from app.database import engine
from sqlalchemy import text

async def update_bots():
    async with engine.begin() as conn:
        await conn.execute(text("UPDATE ai_bots SET tools_config = '{}' WHERE tools_config IS NULL"))
    print("AI bots tools_config column updated successfully")

if __name__ == "__main__":
    asyncio.run(update_bots())
