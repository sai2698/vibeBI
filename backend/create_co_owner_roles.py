import asyncio
from app.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS dashboard_co_owner_roles (
                dashboard_id INTEGER NOT NULL,
                role_id INTEGER NOT NULL,
                PRIMARY KEY (dashboard_id, role_id),
                FOREIGN KEY(dashboard_id) REFERENCES dashboards (id) ON DELETE CASCADE,
                FOREIGN KEY(role_id) REFERENCES roles (id) ON DELETE CASCADE
            );
        """))
        print("Created table dashboard_co_owner_roles successfully")

if __name__ == "__main__":
    asyncio.run(main())
