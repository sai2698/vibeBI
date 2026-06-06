import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import text, create_engine, delete

from app.database import get_db
from app.models import Dataset, Datasource, DatasetColumn, DatasetMetric, DatasetCalculatedColumn, User
from app.schemas import DatasetCreate, DatasetResponse, DatasetUpdate, DatasetMetricResponse, DatasetMetricBase, DatasetColumnUpdate, DatasetMetricUpdate, DatasetJoinCreate, DatasetJoinResponse, DatasetJoinUpdate, DatasetCalculatedColumnBase, DatasetCalculatedColumnResponse, DatasetCalculatedColumnUpdate
from app.auth.dependencies import get_current_active_user, has_permission
from starlette.concurrency import run_in_threadpool
from app.datasources.pool import ds_pool

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

@router.post("/", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def create_dataset(
    ds_in: DatasetCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:data_management"))
):
    datasource = None
    if ds_in.datasource_id:
        result = await db.execute(select(Datasource).where(Datasource.id == ds_in.datasource_id))
        datasource = result.scalar_one_or_none()

    # 1. Pre-compile flow if applicable
    if ds_in.dataset_type == 'flow' and ds_in.flow_config:
        from app.query_builder.flow_compiler import compile_flow_to_sql
        engine_type = datasource.engine if datasource else "postgres"
        ds_in.custom_sql = await compile_flow_to_sql(db, ds_in.flow_config, engine_type)

    # 2. Create the base dataset
    db_dataset = Dataset(
        name=ds_in.name,
        datasource_id=ds_in.datasource_id,
        dataset_type=ds_in.dataset_type,
        schema_name=ds_in.schema_name,
        table_name=ds_in.table_name,
        custom_sql=ds_in.custom_sql,
        flow_config=ds_in.flow_config,
        schema_metadata=ds_in.schema_metadata,
        lob_id=ds_in.lob_id
    )
    db.add(db_dataset)
    await db.flush() # Get the ID
    
    # 2. Automatically discover and seed columns if not provided in schema_json
    # This is the "Semantic Layer" automation
    try:
        # We already fetched datasource above
        if datasource:
            from app.charts.utils import get_sync_uri
            impersonate = datasource.advanced_properties.get("impersonate_user", False) if datasource.advanced_properties else False
            engine = ds_pool.get_engine(get_sync_uri(datasource.connection_uri), current_user.email if impersonate else None)
            
            if ds_in.dataset_type == 'flow':
                from app.query_builder.flow_compiler import compile_flow_to_sql
                query = await compile_flow_to_sql(db, ds_in.flow_config, datasource.engine)
            else:
                from app.charts.utils import get_quoted_table_ref
                table_ref = get_quoted_table_ref(ds_in.schema_name, ds_in.table_name, datasource.engine)
                query = ds_in.custom_sql if ds_in.custom_sql else f"SELECT * FROM {table_ref}"
            
            from app.charts.utils import wrap_query
            discovery_query = wrap_query(query, datasource.engine, limit=0, alias="discovery_tab")
            
            df = await run_in_threadpool(pd.read_sql_query, text(discovery_query), engine)
            from app.charts.utils import deduplicate_dataframe_columns
            df = deduplicate_dataframe_columns(df)
            
            for col_name in df.columns:
                dtype = str(df[col_name].dtype)
                db_col = DatasetColumn(
                    dataset_id=db_dataset.id,
                    column_name=col_name,
                    friendly_name=col_name.replace('_', ' ').title(),
                    data_type=dtype,
                    is_filterable=False,
                    is_groupable=True
                )
                db.add(db_col)
    except Exception as e:
        # We don't fail the whole creation if discovery fails, but we log it
        import traceback
        print(f"Schema discovery failed for dataset '{ds_in.name}': {str(e)}")
        traceback.print_exc()

    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(Dataset)
        .options(selectinload(Dataset.columns), selectinload(Dataset.metrics), selectinload(Dataset.calculated_columns))
        .where(Dataset.id == db_dataset.id)
    )
    return result.scalar_one()

@router.get("/", response_model=list[DatasetResponse])
async def read_datasets(
    lob_id: Optional[int] = None,
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Dataset).options(selectinload(Dataset.columns), selectinload(Dataset.metrics), selectinload(Dataset.calculated_columns))
    if lob_id:
        query = query.where(Dataset.lob_id == lob_id)
        
    result = await db.execute(query.offset(skip).limit(limit))
    datasets = result.scalars().all()
    return datasets

@router.get("/{ds_id}", response_model=DatasetResponse)
async def get_dataset(
    ds_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(Dataset)
        .options(selectinload(Dataset.columns), selectinload(Dataset.metrics), selectinload(Dataset.calculated_columns))
        .where(Dataset.id == ds_id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.patch("/{ds_id}", response_model=DatasetResponse)
async def update_dataset(
    ds_id: int,
    ds_in: DatasetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:data_management"))
):
    result = await db.execute(
        select(Dataset)
        .options(selectinload(Dataset.columns), selectinload(Dataset.metrics), selectinload(Dataset.calculated_columns))
        .where(Dataset.id == ds_id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    update_data = ds_in.model_dump(exclude_unset=True)
    
    # Pre-compile flow if applicable
    if update_data.get('dataset_type') == 'flow' or (dataset.dataset_type == 'flow' and 'flow_config' in update_data):
        from app.query_builder.flow_compiler import compile_flow_to_sql
        flow_cfg = update_data.get('flow_config', dataset.flow_config)
        if flow_cfg:
            datasource_id = update_data.get('datasource_id', dataset.datasource_id)
            ds_res = await db.execute(select(Datasource).where(Datasource.id == datasource_id))
            datasource = ds_res.scalar_one_or_none()
            engine_type = datasource.engine if datasource else "postgres"
            update_data['custom_sql'] = await compile_flow_to_sql(db, flow_cfg, engine_type)
            
    for field, value in update_data.items():
        setattr(dataset, field, value)
        
    await db.commit()
    await db.refresh(dataset)
    return dataset

@router.delete("/{ds_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    ds_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:data_management"))
):
    result = await db.execute(select(Dataset).where(Dataset.id == ds_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    await db.delete(dataset)
    await db.commit()
    return None

@router.post("/{ds_id}/metrics", response_model=DatasetMetricResponse)
async def create_metric(
    ds_id: int,
    metric_in: DatasetMetricBase,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:data_management"))
):
    db_metric = DatasetMetric(
        dataset_id=ds_id,
        name=metric_in.name,
        friendly_name=metric_in.friendly_name,
        expression=metric_in.expression,
        description=metric_in.description
    )
    db.add(db_metric)
    await db.commit()
    await db.refresh(db_metric)
    return db_metric

@router.get("/{ds_id}/calculated-columns", response_model=List[DatasetCalculatedColumnResponse])
async def get_dataset_calculated_columns(
    ds_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:data_management"))
):
    result = await db.execute(
        select(DatasetCalculatedColumn)
        .where(DatasetCalculatedColumn.dataset_id == ds_id)
        .order_by(DatasetCalculatedColumn.created_at.desc())
    )
    return result.scalars().all()

@router.post("/{ds_id}/calculated-columns", response_model=DatasetCalculatedColumnResponse)
async def create_calculated_column(
    ds_id: int,
    col_in: DatasetCalculatedColumnBase,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:data_management"))
):
    # Verify dataset exists
    result = await db.execute(select(Dataset).where(Dataset.id == ds_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    db_col = DatasetCalculatedColumn(
        dataset_id=ds_id,
        name=col_in.name,
        friendly_name=col_in.friendly_name,
        expression=col_in.expression,
        description=col_in.description,
        data_type=col_in.data_type,
        is_filterable=col_in.is_filterable,
        is_visible=col_in.is_visible
    )
    db.add(db_col)
    await db.commit()
    await db.refresh(db_col)
    return db_col

@router.patch("/{ds_id}/calculated-columns/{col_id}", response_model=DatasetCalculatedColumnResponse)
async def update_calculated_column(
    ds_id: int,
    col_id: int,
    col_in: DatasetCalculatedColumnUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:data_management"))
):
    result = await db.execute(
        select(DatasetCalculatedColumn)
        .where(
            DatasetCalculatedColumn.id == col_id,
            DatasetCalculatedColumn.dataset_id == ds_id
        )
    )
    db_col = result.scalar_one_or_none()
    if not db_col:
        raise HTTPException(status_code=404, detail="Calculated column not found")
    
    update_data = col_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_col, field, value)
    
    db.add(db_col)
    await db.commit()
    await db.refresh(db_col)
    return db_col

@router.delete("/{ds_id}/calculated-columns/{col_id}")
async def delete_calculated_column(
    ds_id: int,
    col_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:data_management"))
):
    result = await db.execute(
        select(DatasetCalculatedColumn)
        .where(
            DatasetCalculatedColumn.id == col_id,
            DatasetCalculatedColumn.dataset_id == ds_id
        )
    )
    db_col = result.scalar_one_or_none()
    if not db_col:
        raise HTTPException(status_code=404, detail="Calculated column not found")
    
    await db.delete(db_col)
    await db.commit()
    return {"message": "Calculated column deleted successfully"}

@router.post("/{ds_id}/refresh", response_model=DatasetResponse)
async def refresh_dataset_schema(
    ds_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:data_management"))
):
    result = await db.execute(
        select(Dataset)
        .options(selectinload(Dataset.columns), selectinload(Dataset.metrics), selectinload(Dataset.calculated_columns))
        .where(Dataset.id == ds_id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    result = await db.execute(select(Datasource).where(Datasource.id == dataset.datasource_id))
    datasource = result.scalar_one_or_none()
    if not datasource:
        raise HTTPException(status_code=404, detail="Datasource not found")

    try:
        from app.charts.utils import get_sync_uri
        impersonate = datasource.advanced_properties.get("impersonate_user", False) if datasource.advanced_properties else False
        engine = ds_pool.get_engine(get_sync_uri(datasource.connection_uri), current_user.email if impersonate else None)
        
        if dataset.dataset_type == 'flow':
            from app.query_builder.flow_compiler import compile_flow_to_sql
            query = await compile_flow_to_sql(db, dataset.flow_config, datasource.engine)
        else:
            from app.charts.utils import get_quoted_table_ref
            table_ref = get_quoted_table_ref(dataset.schema_name, dataset.table_name, datasource.engine)
            query = dataset.custom_sql if dataset.custom_sql else f"SELECT * FROM {table_ref}"
            
        from app.charts.utils import wrap_query
        discovery_query = wrap_query(query, datasource.engine, limit=0, alias="discovery_tab")
        df = await run_in_threadpool(pd.read_sql_query, text(discovery_query), engine)
        from app.charts.utils import deduplicate_dataframe_columns
        df = deduplicate_dataframe_columns(df)
        
        # Delete existing columns
        await db.execute(delete(DatasetColumn).where(DatasetColumn.dataset_id == dataset.id))
        
        for col_name in df.columns:
            dtype = str(df[col_name].dtype)
            db_col = DatasetColumn(
                dataset_id=dataset.id,
                column_name=col_name,
                friendly_name=col_name.replace('_', ' ').title(),
                data_type=dtype,
                is_filterable=False,
                is_groupable=True
            )
            db.add(db_col)
            
        await db.commit()
        
        # Reload
        await db.refresh(dataset)
        return dataset
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Schema refresh failed: {e}")

# ─── Semantic Layer: Column Management ───

@router.patch("/{ds_id}/columns/{col_id}", response_model=dict)
async def update_column(
    ds_id: int,
    col_id: int,
    col_in: DatasetColumnUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:data_management"))
):
    """Update column metadata (friendly name, description, flags, etc.)."""
    result = await db.execute(
        select(DatasetColumn).where(DatasetColumn.id == col_id, DatasetColumn.dataset_id == ds_id)
    )
    col = result.scalar_one_or_none()
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")
    
    update_data = col_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(col, key, value)
    
    await db.commit()
    await db.refresh(col)
    return {"status": "ok", "column_id": col.id}

# ─── Semantic Layer: Metric Management ───

@router.patch("/{ds_id}/metrics/{metric_id}", response_model=DatasetMetricResponse)
async def update_metric(
    ds_id: int,
    metric_id: int,
    metric_in: DatasetMetricUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:data_management"))
):
    """Update an existing metric."""
    result = await db.execute(
        select(DatasetMetric).where(DatasetMetric.id == metric_id, DatasetMetric.dataset_id == ds_id)
    )
    metric = result.scalar_one_or_none()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    update_data = metric_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(metric, key, value)
    
    await db.commit()
    await db.refresh(metric)
    return metric

@router.delete("/{ds_id}/metrics/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_metric(
    ds_id: int,
    metric_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:data_management"))
):
    """Delete a metric from a dataset."""
    result = await db.execute(
        select(DatasetMetric).where(DatasetMetric.id == metric_id, DatasetMetric.dataset_id == ds_id)
    )
    metric = result.scalar_one_or_none()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    await db.delete(metric)
    await db.commit()
    return None

# ─── Semantic Layer: Data Preview & Profiling ───

@router.post("/{ds_id}/preview")
async def preview_dataset(
    ds_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Return first 100 rows of data for a dataset."""
    result = await db.execute(select(Dataset).where(Dataset.id == ds_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    result = await db.execute(select(Datasource).where(Datasource.id == dataset.datasource_id))
    datasource = result.scalar_one_or_none()
    if not datasource:
        raise HTTPException(status_code=404, detail="Datasource not found")
    
    try:
        from app.charts.utils import get_sync_uri
        impersonate = datasource.advanced_properties.get("impersonate_user", False) if datasource.advanced_properties else False
        engine = ds_pool.get_engine(get_sync_uri(datasource.connection_uri), current_user.email if impersonate else None)
        from app.charts.utils import wrap_query
        from app.charts.utils import get_quoted_table_ref
        table_ref = get_quoted_table_ref(dataset.schema_name, dataset.table_name, datasource.engine)
        query_str = dataset.custom_sql if dataset.custom_sql else f"SELECT * FROM {table_ref}"
        query_str = wrap_query(query_str, datasource.engine, limit=100, alias="preview_tab")
        df = await run_in_threadpool(pd.read_sql_query, text(query_str), engine)
        from app.charts.utils import deduplicate_dataframe_columns
        df = deduplicate_dataframe_columns(df)
        return {
            "columns": list(df.columns),
            "data": df.to_dict(orient="records"),
            "row_count": len(df)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Preview failed: {e}")

@router.post("/preview-flow")
async def preview_dataflow(
    ds_in: DatasetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Compile and preview a dataflow JSON graph dynamically."""
    if not ds_in.flow_config:
        raise HTTPException(status_code=400, detail="Missing flow_config")
    
    try:
        if not ds_in.datasource_id:
             raise HTTPException(status_code=400, detail="datasource_id required for engine execution context")
             
        result = await db.execute(select(Datasource).where(Datasource.id == ds_in.datasource_id))
        datasource = result.scalar_one_or_none()
        if not datasource:
            raise HTTPException(status_code=404, detail="Datasource not found")
            
        from app.query_builder.flow_compiler import compile_flow_to_sql
        compiled_sql = await compile_flow_to_sql(db, ds_in.flow_config, datasource.engine)
            
        from app.charts.utils import get_sync_uri, wrap_query, deduplicate_dataframe_columns
        impersonate = datasource.advanced_properties.get("impersonate_user", False) if datasource.advanced_properties else False
        engine = ds_pool.get_engine(get_sync_uri(datasource.connection_uri), current_user.email if impersonate else None)
        
        query_str = wrap_query(compiled_sql, datasource.engine, limit=100, alias="preview_flow")
        df = await run_in_threadpool(pd.read_sql_query, text(query_str), engine)
        df = deduplicate_dataframe_columns(df)
        
        import numpy as np
        df.replace([np.inf, -np.inf, np.nan], None, inplace=True)
        
        return {
            "compiled_sql": compiled_sql,
            "columns": list(df.columns),
            "data": df.to_dict(orient="records"),
            "row_count": len(df)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Flow compilation or preview failed: {e}")

@router.post("/{ds_id}/profile")
async def profile_dataset(
    ds_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Return column-level statistics for a dataset."""
    result = await db.execute(select(Dataset).where(Dataset.id == ds_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    result = await db.execute(select(Datasource).where(Datasource.id == dataset.datasource_id))
    datasource = result.scalar_one_or_none()
    if not datasource:
        raise HTTPException(status_code=404, detail="Datasource not found")
    
    try:
        from app.charts.utils import get_sync_uri
        impersonate = datasource.advanced_properties.get("impersonate_user", False) if datasource.advanced_properties else False
        engine = ds_pool.get_engine(get_sync_uri(datasource.connection_uri), current_user.email if impersonate else None)
        from app.charts.utils import wrap_query
        from app.charts.utils import get_quoted_table_ref
        table_ref = get_quoted_table_ref(dataset.schema_name, dataset.table_name, datasource.engine)
        query_str = dataset.custom_sql if dataset.custom_sql else f"SELECT * FROM {table_ref}"
        query_str = wrap_query(query_str, datasource.engine, limit=5000, alias="profile_tab")
        df = await run_in_threadpool(pd.read_sql_query, text(query_str), engine)
        from app.charts.utils import deduplicate_dataframe_columns
        df = deduplicate_dataframe_columns(df)
        
        total_rows = len(df)
        profile = {}
        for col in df.columns:
            col_profile = {
                "column": col,
                "dtype": str(df[col].dtype),
                "null_count": int(df[col].isnull().sum()),
                "null_pct": round(float(df[col].isnull().sum() / total_rows * 100), 1) if total_rows > 0 else 0,
                "distinct_count": int(df[col].nunique()),
                "sample_values": [str(v) for v in df[col].dropna().unique()[:5]]
            }
            if df[col].dtype in ['int64', 'float64', 'int32', 'float32']:
                col_profile["min"] = float(df[col].min()) if not df[col].isnull().all() else None
                col_profile["max"] = float(df[col].max()) if not df[col].isnull().all() else None
                col_profile["mean"] = round(float(df[col].mean()), 2) if not df[col].isnull().all() else None
            profile[col] = col_profile
        
        return {"total_rows": total_rows, "columns": profile}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Profiling failed: {e}")

@router.get("/{ds_id}/columns/{col_name}/values")
async def get_column_values(
    ds_id: int,
    col_name: str,
    search: Optional[str] = None,
    limit: int = 20000,
    dashboard_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Fetch unique values for a column to populate filters."""
    result = await db.execute(
        select(Dataset)
        .options(selectinload(Dataset.columns), selectinload(Dataset.calculated_columns))
        .where(Dataset.id == ds_id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    result = await db.execute(select(Datasource).where(Datasource.id == dataset.datasource_id))
    datasource = result.scalar_one_or_none()
    if not datasource:
        raise HTTPException(status_code=404, detail="Datasource not found")

    # --- CACHE CHECK ---
    from app.cache import get_cache, set_cache
    import hashlib
    
    cache_key = None
    cache_ttl = None
    if dashboard_id:
        from app.models import Dashboard
        dash_res = await db.execute(select(Dashboard).where(Dashboard.id == dashboard_id))
        dashboard = dash_res.scalar_one_or_none()
        if dashboard and dashboard.cache_config and dashboard.cache_config.get("enable_filter_cache", False):
            cache_ttl = int(dashboard.cache_config.get("filter_ttl", 3600))
            hash_str = f"{ds_id}:{col_name}:{search or ''}:{current_user.id}"
            payload_hash = hashlib.md5(hash_str.encode()).hexdigest()
            cache_key = f"dashboard:{dashboard_id}:filters:{payload_hash}"
            
            cached_data = await get_cache(cache_key)
            if cached_data is not None:
                return cached_data
    # -------------------
    
    try:
        from app.charts.utils import get_sync_uri
        impersonate = datasource.advanced_properties.get("impersonate_user", False) if datasource.advanced_properties else False
        engine = ds_pool.get_engine(get_sync_uri(datasource.connection_uri), current_user.email if impersonate else None)
        
        from app.charts.utils import get_quoted_table_ref
        table_ref = get_quoted_table_ref(dataset.schema_name, dataset.table_name, datasource.engine)
        base_query = dataset.custom_sql if dataset.custom_sql else f"SELECT * FROM {table_ref}"
        
        # Find the actual column name from metadata to ensure correct casing
        db_col = next((c for c in dataset.columns if c.column_name == col_name or c.friendly_name == col_name), None)
        actual_col = db_col.column_name if db_col else col_name
        
        from app.charts.utils import wrap_query
        
        # Build discovery query for unique values
        is_oracle = "oracle" in datasource.engine.lower()
        is_mysql = "mysql" in datasource.engine.lower()
        alias_keyword = "" if is_oracle else "AS "
        
        # Dialect-specific column identifier
        if is_mysql:
            col_identifier = f"`{actual_col}`"
        elif is_oracle and actual_col.replace('_', '').isalnum():
            col_identifier = actual_col
        else:
            col_identifier = f'"{actual_col}"'

        val_query = f"SELECT DISTINCT {col_identifier} FROM ({base_query.strip().rstrip(';')}) {alias_keyword}val_tab"
        if search:
            if is_oracle:
                val_query += f" WHERE UPPER(CAST({col_identifier} AS VARCHAR2(4000))) LIKE UPPER('%{search}%')"
            elif is_mysql:
                val_query += f" WHERE CAST({col_identifier} AS CHAR) LIKE '%{search}%'"
            else:
                val_query += f" WHERE CAST({col_identifier} AS TEXT) ILIKE '%{search}%'"
        
        val_query += f" ORDER BY {col_identifier} ASC"
        
        if limit and limit > 0:
            if is_oracle:
                val_query += f" FETCH FIRST {limit} ROWS ONLY"
            else:
                val_query += f" LIMIT {limit}"
        
        df = await run_in_threadpool(pd.read_sql_query, text(val_query), engine)
        
        # Find the correct column in the dataframe (case-insensitive for Oracle/Postgres)
        res_col = next((c for c in df.columns if c.lower() == actual_col.lower()), df.columns[0] if len(df.columns) > 0 else None)
        result_data = []
        if res_col:
            result_data = df[res_col].dropna().tolist()
            
        if cache_key and cache_ttl:
            await set_cache(cache_key, result_data, cache_ttl)
            
        return result_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch values: {e}")

# ─── Semantic Layer: Join Management ───

from app.models import DatasetJoin

@router.post("/{ds_id}/joins", response_model=DatasetJoinResponse)
async def create_dataset_join(
    ds_id: int,
    join_in: DatasetJoinCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:data_management"))
):
    if ds_id != join_in.left_dataset_id and ds_id != join_in.right_dataset_id:
        raise HTTPException(status_code=400, detail="Path ds_id must be either left or right dataset")
        
    db_join = DatasetJoin(
        left_dataset_id=join_in.left_dataset_id,
        right_dataset_id=join_in.right_dataset_id,
        join_type=join_in.join_type,
        join_condition=join_in.join_condition
    )
    db.add(db_join)
    await db.commit()
    await db.refresh(db_join)
    return db_join

@router.get("/{ds_id}/joins", response_model=List[DatasetJoinResponse])
async def get_dataset_joins(
    ds_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from sqlalchemy import or_
    result = await db.execute(
        select(DatasetJoin).where(
            or_(DatasetJoin.left_dataset_id == ds_id, DatasetJoin.right_dataset_id == ds_id)
        )
    )
    return result.scalars().all()

@router.delete("/joins/{join_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset_join(
    join_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:data_management"))
):
    result = await db.execute(select(DatasetJoin).where(DatasetJoin.id == join_id))
    db_join = result.scalar_one_or_none()
    if not db_join:
        raise HTTPException(status_code=404, detail="Join not found")
        
    await db.delete(db_join)
    await db.commit()
    return None
