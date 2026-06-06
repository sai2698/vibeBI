import sqlite3
try:
    conn = sqlite3.connect('bi.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tables: {tables}")
    cursor.execute("SELECT id, name FROM datasources;")
    ds = cursor.fetchall()
    print(f"Datasources: {ds}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
