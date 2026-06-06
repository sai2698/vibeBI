import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def check_columns():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name='saved_queries' ORDER BY ordinal_position")
        )
        columns = [row[0] for row in result]
        print("Columns in saved_queries table:")
        for col in columns:
            print(f"  - {col}")
        print(f"\nTotal columns: {len(columns)}")
        print(f"Has query_config: {'query_config' in columns}")

if __name__ == "__main__":
    asyncio.run(check_columns())
