import asyncio
from app.database import AsyncSessionLocal as SessionLocal
from sqlalchemy import text

async def inspect():
    async with SessionLocal() as session:
        result = await session.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        tables = [r[0] for r in result.fetchall()]
        print("Tables in public schema:")
        print(tables)
        
        for table in tables:
            print(f"\nColumns in table '{table}':")
            cols_res = await session.execute(text(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '{table}'
            """))
            for col in cols_res.fetchall():
                print(f"  {col[0]}: {col[1]}")
            
if __name__ == "__main__":
    asyncio.run(inspect())
