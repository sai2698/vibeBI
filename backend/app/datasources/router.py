from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import Datasource, User
from app.schemas import DatasourceCreate, DatasourceResponse, DatasourceTestRequest, DatasourceTestResponse, DatasourceUpdate
from app.auth.dependencies import get_current_active_user, get_current_admin_user, has_permission
from app.charts.utils import get_sync_uri
from sqlalchemy import create_engine
import asyncio

router = APIRouter(prefix="/api/datasources", tags=["datasources"])

@router.post("/", response_model=DatasourceResponse, status_code=status.HTTP_201_CREATED)
async def create_datasource(
    ds_in: DatasourceCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("datasource:write"))
):
    # In a real app, you would encrypt connection_uri before storing
    db_datasource = Datasource(
        name=ds_in.name,
        engine=ds_in.engine,
        connection_uri=ds_in.connection_uri,
        advanced_properties=ds_in.advanced_properties
    )
    db.add(db_datasource)
    await db.commit()
    await db.refresh(db_datasource)
    return db_datasource

@router.post("/test", response_model=DatasourceTestResponse)
async def test_datasource_connection(
    req: DatasourceTestRequest,
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Convert async URIs to sync equivalents for testing with create_engine
        uri = get_sync_uri(req.connection_uri)
        
        connect_args = {}
        if "oracle" not in uri.lower():
            connect_args["connect_timeout"] = 5
            
        impersonate = req.advanced_properties.get("impersonate_user", False) if req.advanced_properties else False
        if impersonate and ("presto" in uri.lower() or "trino" in uri.lower() or "hive" in uri.lower() or "databricks" in uri.lower()):
            connect_args["user"] = current_user.email
            
        engine = create_engine(uri, pool_pre_ping=True, connect_args=connect_args)
        
        if impersonate and "starrocks" in uri.lower():
            from sqlalchemy import event
            @event.listens_for(engine, "connect")
            def impersonate_session(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                cursor.execute(f"EXECUTE AS '{current_user.email}' WITH NO REVERT")
                cursor.close()
        
        def _test_connection():
            with engine.connect() as conn:
                pass
        
        await asyncio.to_thread(_test_connection)
        
        return DatasourceTestResponse(success=True, message="Connection successful")
    except Exception as e:
        return DatasourceTestResponse(success=False, message=f"Connection failed: {str(e)}")

@router.get("/", response_model=list[DatasourceResponse])
async def read_datasources(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(Datasource).offset(skip).limit(limit))
    datasources = result.scalars().all()
    # In a real app, strip out passwords from connection_uri before returning
    return datasources

@router.patch("/{ds_id}", response_model=DatasourceResponse)
async def update_datasource(
    ds_id: int,
    ds_in: DatasourceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("datasource:write"))
):
    result = await db.execute(select(Datasource).where(Datasource.id == ds_id))
    datasource = result.scalar_one_or_none()
    if not datasource:
        raise HTTPException(status_code=404, detail="Datasource not found")
    
    update_data = ds_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(datasource, field, value)
    
    await db.commit()
    await db.refresh(datasource)
    return datasource

@router.delete("/{ds_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_datasource(
    ds_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("datasource:write"))
):
    result = await db.execute(select(Datasource).where(Datasource.id == ds_id))
    datasource = result.scalar_one_or_none()
    if not datasource:
        raise HTTPException(status_code=404, detail="Datasource not found")
        
    await db.delete(datasource)
    await db.commit()
    return None
