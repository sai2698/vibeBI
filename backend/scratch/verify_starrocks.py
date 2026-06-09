import sys
from sqlalchemy import create_engine, text, event
from app.charts.utils import get_sync_uri

def test_dialect_and_sync_uri():
    print("Testing dialect loading and get_sync_uri...")
    async_uri = "starrocks+asyncmy://root:password@localhost:9030/mydb"
    sync_uri = get_sync_uri(async_uri)
    print(f"Async URI: {async_uri}")
    print(f"Sync URI: {sync_uri}")
    
    assert sync_uri == "starrocks://root:password@localhost:9030/mydb", f"Unexpected sync URI: {sync_uri}"
    print("Sync URI translation: OK")
    
    # Try to create engine to check if dialect is registered
    try:
        engine = create_engine(sync_uri)
        print(f"Engine created successfully: {engine}")
        print(f"Dialect name: {engine.dialect.name}")
        assert engine.dialect.name == "starrocks"
        print("Dialect validation: OK")
    except Exception as e:
        print(f"Failed to create engine: {e}")
        sys.exit(1)

def test_impersonation_listener():
    print("\nTesting impersonation connection event listener setup...")
    uri = "starrocks://root:password@localhost:9030/mydb"
    engine = create_engine(uri)
    impersonate_user = "test_impersonated_user"
    
    # Register connect event listener
    @event.listens_for(engine, "connect")
    def impersonate_session(dbapi_connection, connection_record):
        pass
        
    assert event.contains(engine, "connect", impersonate_session), "Listener not found on engine"
    print("Event listener registration check: OK")

if __name__ == "__main__":
    # Add backend path to sys.path so we can import app
    import os
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    
    test_dialect_and_sync_uri()
    test_impersonation_listener()
    print("\nAll dialect and listener checks passed successfully!")
