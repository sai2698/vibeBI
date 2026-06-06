import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        # Create chart_folders table
        await conn.execute(text("""
        CREATE TABLE IF NOT EXISTS chart_folders (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            parent_id INTEGER REFERENCES chart_folders(id) ON DELETE CASCADE,
            lob_id INTEGER REFERENCES lines_of_business(id) ON DELETE CASCADE,
            owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """))

        # Add folder_id to charts
        await conn.execute(text("""
        ALTER TABLE charts ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES chart_folders(id) ON DELETE SET NULL;
        """))

        # Migrate unique folder names
        # Note: If folder is just a string, we insert them into chart_folders
        # We assume they belong to the chart's lob_id and owner_id for the first one found
        await conn.execute(text("""
        INSERT INTO chart_folders (name, lob_id, owner_id)
        SELECT DISTINCT folder, lob_id, owner_id
        FROM charts
        WHERE folder IS NOT NULL AND folder != '';
        """))

        # Update charts to point to the new folder_id
        await conn.execute(text("""
        UPDATE charts c
        SET folder_id = f.id
        FROM chart_folders f
        WHERE c.folder = f.name AND c.lob_id = f.lob_id AND c.folder IS NOT NULL AND c.folder != '';
        """))

        # Finally, drop the old folder column
        await conn.execute(text("""
        ALTER TABLE charts DROP COLUMN IF EXISTS folder;
        """))
        print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
