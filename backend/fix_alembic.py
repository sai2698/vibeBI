import psycopg2

conn = psycopg2.connect('postgresql://postgres:password@localhost:5432/bi_platform')
cur = conn.cursor()

# Check current version
cur.execute('SELECT * FROM alembic_version')
current = cur.fetchone()
print(f"Current version: {current}")

# Update to correct version
cur.execute("UPDATE alembic_version SET version_num = '318d13f5de81'")
conn.commit()

print("Updated to 318d13f5de81")
conn.close()
