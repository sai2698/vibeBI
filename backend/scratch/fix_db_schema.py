import asyncio
from sqlalchemy import text
from app.database import engine

async def fix_schema():
    async with engine.begin() as conn:
        print("Checking and fixing database schema...")
        
        # 1. Fix datasets table
        try:
            await conn.execute(text("ALTER TABLE datasets ADD COLUMN IF NOT EXISTS schema_name VARCHAR(255);"))
            print("Verified 'schema_name' in 'datasets' table.")
        except Exception as e:
            print(f"Error updating 'datasets': {e}")

        # 2. Fix users table
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_source VARCHAR(50) DEFAULT 'local';"))
            print("Verified 'auth_source' in 'users' table.")
        except Exception as e:
            print(f"Error updating 'users': {e}")

        # 3. Create ldap_config table if not exists
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS ldap_config (
                    id SERIAL PRIMARY KEY,
                    is_enabled BOOLEAN DEFAULT FALSE,
                    server_uri VARCHAR(255),
                    bind_dn VARCHAR(255),
                    bind_password VARCHAR(255),
                    base_dn VARCHAR(255),
                    user_search_base VARCHAR(255),
                    user_object_class VARCHAR(100) DEFAULT 'person',
                    user_id_attribute VARCHAR(100) DEFAULT 'uid',
                    user_email_attribute VARCHAR(100) DEFAULT 'mail',
                    user_name_attribute VARCHAR(100) DEFAULT 'cn',
                    group_search_base VARCHAR(255),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
            print("Verified 'ldap_config' table.")
            
            # Ensure at least one row exists
            result = await conn.execute(text("SELECT COUNT(*) FROM ldap_config"))
            if result.scalar() == 0:
                await conn.execute(text("INSERT INTO ldap_config (is_enabled) VALUES (FALSE)"))
                print("Initialized default LDAP configuration.")
                
        except Exception as e:
            print(f"Error creating 'ldap_config': {e}")

        # 4. Fix dashboards table
        columns_to_add = [
            ("background_color", "VARCHAR(20) DEFAULT '#f8fafc'"),
            ("text_color", "VARCHAR(20) DEFAULT '#0f172a'"),
            ("description_color", "VARCHAR(20) DEFAULT '#64748b'"),
            ("filter_config", "JSONB DEFAULT '[]'::jsonb"),
            ("logo_url", "VARCHAR(512)"),
            ("grid_gap", "INTEGER DEFAULT 16"),
            ("grid_cols", "INTEGER DEFAULT 12"),
            ("row_height", "INTEGER DEFAULT 80"),
            ("search_vector", "TSVECTOR"),
            ("is_public", "BOOLEAN DEFAULT FALSE"),
            ("is_featured", "BOOLEAN DEFAULT FALSE"),
            ("tags", "VARCHAR[]")
        ]
        
        for col_name, col_def in columns_to_add:
            try:
                await conn.execute(text(f"ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS {col_name} {col_def};"))
                print(f"Verified '{col_name}' in 'dashboards' table.")
            except Exception as e:
                print(f"Error adding '{col_name}' to 'dashboards': {e}")

        # 5. Fix ai_chat_messages table for Agentic features
        ai_chat_columns = [
            ("reasoning_content", "TEXT"),
            ("tool_calls", "JSONB DEFAULT '[]'::jsonb"),
            ("tool_results", "JSONB DEFAULT '[]'::jsonb")
        ]
        for col_name, col_def in ai_chat_columns:
            try:
                await conn.execute(text(f"ALTER TABLE ai_chat_messages ADD COLUMN IF NOT EXISTS {col_name} {col_def};"))
                print(f"Verified '{col_name}' in 'ai_chat_messages' table.")
            except Exception as e:
                print(f"Error adding '{col_name}' to 'ai_chat_messages': {e}")

        print("Schema fix complete!")

if __name__ == "__main__":
    asyncio.run(fix_schema())
