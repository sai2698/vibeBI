import asyncio
from sqlalchemy import text
from app.database import engine

async def add_column():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE datasets ADD COLUMN schema_name VARCHAR(255);"))
            print("Successfully added column schema_name to datasets table.")
        except Exception as e:
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    asyncio.run(add_column())
