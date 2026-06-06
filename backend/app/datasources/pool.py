from sqlalchemy import create_engine, Engine
from typing import Dict
import threading

class DataSourcePool:
    _instance = None
    _lock = threading.Lock()
    _pools: Dict[str, Engine] = {}

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(DataSourcePool, cls).__new__(cls)
            return cls._instance

    def get_engine(self, connection_uri: str, impersonate_user: str = None) -> Engine:
        key = f"{connection_uri}::{impersonate_user}" if impersonate_user else connection_uri
        if key not in self._pools:
            with self._lock:
                if key not in self._pools:
                    connect_args = {}
                    if impersonate_user and ("presto" in connection_uri.lower() or "trino" in connection_uri.lower() or "hive" in connection_uri.lower() or "databricks" in connection_uri.lower()):
                        connect_args["user"] = impersonate_user
                    
                    self._pools[key] = create_engine(
                        connection_uri,
                        pool_size=10,
                        max_overflow=5,
                        pool_pre_ping=True,
                        pool_recycle=3600,
                        connect_args=connect_args
                    )
        return self._pools[key]

# Singleton instance
ds_pool = DataSourcePool()
