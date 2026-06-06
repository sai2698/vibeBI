import time
import pandas as pd
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, create_engine

from app.database import get_db
from app.models import Datasource, User
from app.schemas import SQLExecuteRequest, SQLExecuteResponse, SavedQueryFolderCreate, SavedQueryFolderResponse, SavedQueryFolderRename
from app.auth.dependencies import get_current_active_user, has_permission
from app.charts.utils import get_sync_uri
from starlette.concurrency import run_in_threadpool
from app.datasources.pool import ds_pool
from app.models import AuditLog

router = APIRouter(prefix="/api/sqllab", tags=["sqllab"])

@router.post("/execute", response_model=SQLExecuteResponse)
async def execute_sql(
    request: SQLExecuteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:sqllab"))
):
    start_time = time.time()
    
    # 1. Fetch the datasource
    result = await db.execute(select(Datasource).where(Datasource.id == request.datasource_id))
    datasource = result.scalar_one_or_none()
    if not datasource:
        raise HTTPException(status_code=404, detail="Datasource not found")

    try:
        impersonate = datasource.advanced_properties.get("impersonate_user", False) if datasource.advanced_properties else False
        engine = ds_pool.get_engine(get_sync_uri(datasource.connection_uri), current_user.email if impersonate else None)
        
        # Execute query using pandas for easy serialization
        query = request.query
        
        # Only wrap in SELECT * FROM (...) if it's a SELECT query
        stripped_query = ""
        for line in query.splitlines():
            line_content = line.split('--')[0].strip()
            if line_content:
                stripped_query += line_content + " "
        
        is_select = stripped_query.strip().upper().startswith("SELECT") or \
                    stripped_query.strip().upper().startswith("WITH")
        
        # Strip trailing semicolon
        query = query.strip().rstrip(';')
        
        if request.limit and is_select:
            engine_name = datasource.engine.lower()
            if "oracle" in engine_name:
                query = f"SELECT * FROM ({query}) subquery FETCH FIRST {request.limit} ROWS ONLY"
            else:
                query = f"SELECT * FROM ({query}) AS subquery LIMIT {request.limit}"
            
        if is_select:
            # Wrap the blocking call in run_in_threadpool
            df = await run_in_threadpool(pd.read_sql_query, text(query), engine)
            from app.charts.utils import deduplicate_dataframe_columns
            df = deduplicate_dataframe_columns(df)
            columns = df.columns.tolist()
            rows = df.where(pd.notnull(df), None).to_dict(orient="records")
        else:
            # For DDL/DML, execute in thread pool
            raw_query = request.query
            statements = []
            current_stmt = []
            for line in raw_query.splitlines():
                clean_line = line.split('--')[0]
                if ';' in clean_line:
                    parts = clean_line.split(';')
                    for i, part in enumerate(parts):
                        current_stmt.append(part)
                        if i < len(parts) - 1:
                            stmt_str = " ".join(current_stmt).strip()
                            if stmt_str:
                                statements.append(stmt_str)
                            current_stmt = []
                else:
                    current_stmt.append(clean_line)
            
            final_stmt = " ".join(current_stmt).strip()
            if final_stmt:
                statements.append(final_stmt)
                
            if not statements and raw_query.strip():
                statements = [raw_query.strip().rstrip(';')]

            def _execute_sync(stmts, eng):
                with eng.connect() as conn:
                    for s in stmts:
                        if s.strip().upper() == "COMMIT":
                            conn.commit()
                        elif s.strip():
                            conn.execute(text(s))
                    conn.commit()

            await run_in_threadpool(_execute_sync, statements, engine)
                
            columns = []
            rows = []
        
        execution_time_ms = (time.time() - start_time) * 1000
        
        # --- AUDIT LOGGING ---
        audit_log = AuditLog(
            user_id=current_user.id,
            action="execute_sqllab",
            entity_id=str(datasource.id),
            details={
                "query": request.query,
                "execution_time_ms": execution_time_ms,
                "status": "success",
                "rows_returned": len(rows)
            }
        )
        db.add(audit_log)
        await db.commit()
        # ---------------------

        return SQLExecuteResponse(
            columns=columns,
            rows=rows,
            execution_time_ms=execution_time_ms
        )
    except Exception as e:
        execution_time_ms = (time.time() - start_time) * 1000
        
        # --- AUDIT LOGGING ---
        audit_log = AuditLog(
            user_id=current_user.id,
            action="execute_sqllab",
            entity_id=str(datasource.id),
            details={
                "query": request.query,
                "execution_time_ms": execution_time_ms,
                "status": "error",
                "error": str(e)
            }
        )
        db.add(audit_log)
        await db.commit()
        # ---------------------

        return SQLExecuteResponse(
            columns=[],
            rows=[],
            execution_time_ms=execution_time_ms,
            error=str(e)
        )

@router.get("/schemas")
async def get_schemas(
    datasource_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:sqllab"))
):
    result = await db.execute(select(Datasource).where(Datasource.id == datasource_id))
    datasource = result.scalar_one_or_none()
    if not datasource:
        raise HTTPException(status_code=404, detail="Datasource not found")

    try:
        from sqlalchemy import inspect
        engine = create_engine(get_sync_uri(datasource.connection_uri))
        inspector = inspect(engine)
        schemas = inspector.get_schema_names()
        return sorted(schemas)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tables")
async def get_tables(
    datasource_id: int,
    schema: str = None,
    search: str = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:sqllab"))
):
    result = await db.execute(select(Datasource).where(Datasource.id == datasource_id))
    datasource = result.scalar_one_or_none()
    if not datasource:
        raise HTTPException(status_code=404, detail="Datasource not found")

    try:
        impersonate = datasource.advanced_properties.get("impersonate_user", False) if datasource.advanced_properties else False
        engine = ds_pool.get_engine(get_sync_uri(datasource.connection_uri), current_user.email if impersonate else None)
        
        def _get_tables():
            from sqlalchemy import inspect
            inspector = inspect(engine)
            # 1. Get all table names (fast)
            all_tables = inspector.get_table_names(schema=schema)
            # 2. Add view names as well if applicable
            try:
                views = inspector.get_view_names(schema=schema)
                all_tables.extend(views)
            except:
                pass 
            return sorted(list(set(all_tables)))

        all_tables = await run_in_threadpool(_get_tables)

        # 3. Apply search filter
        if search:
            all_tables = [t for t in all_tables if search.lower() in t.lower()]

        # 4. Paginate
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_tables = all_tables[start_idx:end_idx]
            
        return {
            "tables": paginated_tables,
            "total_count": len(all_tables),
            "page": page,
            "page_size": page_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metadata")
async def get_datasource_metadata(
    datasource_id: int,
    schema: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:sqllab"))
):
    """Returns a full schema mapping {table: [columns]} for autocomplete."""
    result = await db.execute(select(Datasource).where(Datasource.id == datasource_id))
    datasource = result.scalar_one_or_none()
    if not datasource:
        raise HTTPException(status_code=404, detail="Datasource not found")

    try:
        impersonate = datasource.advanced_properties.get("impersonate_user", False) if datasource.advanced_properties else False
        engine = ds_pool.get_engine(get_sync_uri(datasource.connection_uri), current_user.email if impersonate else None)
        
        def _get_metadata():
            from sqlalchemy import inspect
            inspector = inspect(engine)
            metadata = {}
            
            tables = inspector.get_table_names(schema=schema)
            # Limit to first 100 tables for performance in metadata fetch
            # In a real enterprise app, we might use a background task or cache this
            for table in tables[:100]:
                try:
                    cols = inspector.get_columns(table, schema=schema)
                    metadata[table] = [c["name"] for c in cols]
                except:
                    metadata[table] = []
            return metadata

        schema_data = await run_in_threadpool(_get_metadata)
        return schema_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/table-columns")
async def get_table_columns(
    datasource_id: int,
    table_name: str,
    schema: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:sqllab"))
):
    result = await db.execute(select(Datasource).where(Datasource.id == datasource_id))
    datasource = result.scalar_one_or_none()
    if not datasource:
        raise HTTPException(status_code=404, detail="Datasource not found")

    try:
        impersonate = datasource.advanced_properties.get("impersonate_user", False) if datasource.advanced_properties else False
        engine = ds_pool.get_engine(get_sync_uri(datasource.connection_uri), current_user.email if impersonate else None)
        
        def _get_columns():
            from sqlalchemy import inspect
            inspector = inspect(engine)
            return [
                {"name": c["name"], "type": str(c["type"])} 
                for c in inspector.get_columns(table_name, schema=schema)
            ]
        
        columns = await run_in_threadpool(_get_columns)
        return columns
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Saved Queries CRUD ---
from app.models import SavedQuery
from app.schemas import SavedQueryCreate, SavedQueryUpdate, SavedQueryResponse

@router.post("/saved", response_model=SavedQueryResponse)
async def create_saved_query(
    query_in: SavedQueryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_query = SavedQuery(
        **query_in.model_dump(),
        owner_id=current_user.id
    )
    db.add(db_query)
    await db.commit()
    await db.refresh(db_query)
    return db_query

@router.get("/saved", response_model=List[SavedQueryResponse])
async def list_saved_queries(
    search: Optional[str] = None,
    folder: Optional[str] = None,
    datasource_id: Optional[int] = None,
    datamart_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(SavedQuery)
    if search:
        query = query.where(SavedQuery.name.ilike(f"%{search}%"))
    if folder:
        query = query.where(SavedQuery.folder == folder)
    if datasource_id:
        query = query.where(SavedQuery.datasource_id == datasource_id)
    if datamart_id:
        query = query.where(SavedQuery.datamart_id == datamart_id)
    
    # In a real app, you might want to filter by owner_id or visibility
    result = await db.execute(query.order_by(SavedQuery.updated_at.desc()))
    return result.scalars().all()

@router.get("/saved/{query_id}", response_model=SavedQueryResponse)
async def get_saved_query(
    query_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(SavedQuery).where(SavedQuery.id == query_id))
    db_query = result.scalar_one_or_none()
    if not db_query:
        raise HTTPException(status_code=404, detail="Saved query not found")
    return db_query

@router.patch("/saved/{query_id}", response_model=SavedQueryResponse)
async def update_saved_query(
    query_id: int,
    query_in: SavedQueryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(SavedQuery).where(SavedQuery.id == query_id))
    db_query = result.scalar_one_or_none()
    if not db_query:
        raise HTTPException(status_code=404, detail="Saved query not found")
        
    update_data = query_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_query, field, value)
        
    await db.commit()
    await db.refresh(db_query)
    return db_query

@router.delete("/saved/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_query(
    query_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(SavedQuery).where(SavedQuery.id == query_id))
    db_query = result.scalar_one_or_none()
    if not db_query:
        raise HTTPException(status_code=404, detail="Saved query not found")
        
    await db.delete(db_query)
    await db.commit()
    return None

# --- Folder Management ---
from app.schemas import SavedQueryFolderCreate, SavedQueryFolderResponse

@router.get("/folders")
async def get_folders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all unique folders with query counts"""
    result = await db.execute(select(SavedQuery).where(SavedQuery.folder.isnot(None)))
    queries = result.scalars().all()
    
    folders_dict: dict = {}
    for q in queries:
        if q.folder:
            if q.folder not in folders_dict:
                folders_dict[q.folder] = {"name": q.folder, "description": None, "query_count": 0}
            folders_dict[q.folder]["query_count"] += 1
    
    return sorted(folders_dict.values(), key=lambda x: x["name"])

@router.post("/folders", response_model=SavedQueryFolderResponse)
async def create_folder(
    folder_in: SavedQueryFolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new folder (just validates it doesn't exist)"""
    # Check if any query already has this folder name
    result = await db.execute(select(SavedQuery).where(SavedQuery.folder == folder_in.name))
    existing = result.scalar_one_or_none()
    
    # Folder exists if any query has this folder name
    if existing:
        raise HTTPException(status_code=400, detail="Folder already exists")
    
    # For now, we just return the folder info
    # The folder will be "created" when a query is saved to it
    return SavedQueryFolderResponse(name=folder_in.name, description=folder_in.description, query_count=0)

@router.delete("/folders")
async def delete_folder(
    folder: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a folder (moves queries to root)"""
    result = await db.execute(select(SavedQuery).where(SavedQuery.folder == folder))
    queries = result.scalars().all()
    
    if not queries:
        raise HTTPException(status_code=404, detail="Folder not found or empty")
    
    # Move all queries in this folder to root (folder = NULL)
    for query in queries:
        query.folder = None
    
    await db.commit()
    return {"message": f"Folder '{folder}' deleted. {len(queries)} queries moved to root."}

@router.patch("/folders")
async def rename_folder(
    folder_rename: SavedQueryFolderRename,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Rename a folder"""
    old_name = folder_rename.old_name
    new_name = folder_rename.new_name
    
    if old_name == new_name:
        raise HTTPException(status_code=400, detail="New name must be different from old name")
    
    # Check if new folder name already exists
    result = await db.execute(select(SavedQuery).where(SavedQuery.folder == new_name))
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="A folder with this name already exists")
    
    # Get all queries in the old folder
    result = await db.execute(select(SavedQuery).where(SavedQuery.folder == old_name))
    queries = result.scalars().all()
    
    if not queries:
        raise HTTPException(status_code=404, detail="Folder not found or empty")
    
    # Update all queries to use the new folder name
    for query in queries:
        query.folder = new_name
    
    await db.commit()
    return SavedQueryFolderResponse(name=new_name, description=None, query_count=len(queries))
