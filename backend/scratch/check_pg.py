from sqlalchemy import create_engine, text
try:
    # Use sync driver for simple check
    engine = create_engine("postgresql://postgres:password@localhost:5432/bi_platform")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, name FROM datasources;"))
        rows = result.fetchall()
        print(f"Datasources: {rows}")
except Exception as e:
    print(f"Error: {e}")
