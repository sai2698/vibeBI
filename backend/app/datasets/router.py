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

async def _validate_expression(db: AsyncSession, dataset: Dataset, expression: str, current_user: User):
    from app.charts.utils import get_sync_uri, get_quoted_table_ref
    
    result = await db.execute(select(Datasource).where(Datasource.id == dataset.datasource_id))
    datasource = result.scalar_one_or_none()
    if not datasource:
        return
        
    try:
        impersonate = datasource.advanced_properties.get("impersonate_user", False) if datasource.advanced_properties else False
        engine = ds_pool.get_engine(get_sync_uri(datasource.connection_uri), current_user.email if impersonate else None)
        
        table_ref = get_quoted_table_ref(dataset.schema_name, dataset.table_name, datasource.engine)
        
        if dataset.dataset_type == "flow" and dataset.custom_sql:
            base_query = dataset.custom_sql
        elif dataset.custom_sql:
            base_query = dataset.custom_sql
        else:
            base_query = f"SELECT * FROM {table_ref}"
            
        is_oracle = "oracle" in (datasource.engine or "").lower()
        alias_keyword = "" if is_oracle else "AS "
        
        test_query = f"SELECT {expression} FROM ({base_query.strip().rstrip(';')}) {alias_keyword}val_tab"
        
        if is_oracle:
            test_query += f" FETCH FIRST 1 ROWS ONLY"
        else:
            test_query += f" LIMIT 1"
            
        await run_in_threadpool(pd.read_sql_query, text(test_query), engine)
    except Exception as e:
        error_msg = str(e)
        if hasattr(e, "orig"):
            error_msg = str(e.orig)
        raise HTTPException(status_code=400, detail=f"Invalid SQL expression: {error_msg}")


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
    # Verify dataset exists
    result = await db.execute(select(Dataset).where(Dataset.id == ds_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    await _validate_expression(db, dataset, metric_in.expression, current_user)
    
    db_metric = DatasetMetric(
        dataset_id=ds_id,
        name=metric_in.name,
        friendly_name=metric_in.friendly_name,
        expression=metric_in.expression,
        description=metric_in.description,
        is_visible=metric_in.is_visible
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
        
    await _validate_expression(db, dataset, col_in.expression, current_user)
    
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
    if "expression" in update_data:
        result = await db.execute(select(Dataset).where(Dataset.id == ds_id))
        dataset = result.scalar_one_or_none()
        if dataset:
            await _validate_expression(db, dataset, update_data["expression"], current_user)
            
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
    if "expression" in update_data:
        result_ds = await db.execute(select(Dataset).where(Dataset.id == ds_id))
        dataset = result_ds.scalar_one_or_none()
        if dataset:
            await _validate_expression(db, dataset, update_data["expression"], current_user)
            
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
        import numpy as np
        df.replace([np.inf, -np.inf, np.nan, pd.NaT], None, inplace=True)
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
        df.replace([np.inf, -np.inf, np.nan, pd.NaT], None, inplace=True)
        
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
                import math
                min_val = df[col].min() if not df[col].isnull().all() else None
                max_val = df[col].max() if not df[col].isnull().all() else None
                mean_val = df[col].mean() if not df[col].isnull().all() else None
                col_profile["min"] = float(min_val) if min_val is not None and math.isfinite(float(min_val)) else None
                col_profile["max"] = float(max_val) if max_val is not None and math.isfinite(float(max_val)) else None
                col_profile["mean"] = round(float(mean_val), 2) if mean_val is not None and math.isfinite(float(mean_val)) else None
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
    applied_filters: Optional[str] = None,
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
            hash_str = f"{ds_id}:{col_name}:{search or ''}:{current_user.id}:{applied_filters or ''}"
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
        calc_col = next((c for c in dataset.calculated_columns if c.name == col_name or c.expression == col_name), None)
        
        is_expression = False
        if db_col:
            actual_col = db_col.column_name
        elif calc_col:
            actual_col = calc_col.expression
            is_expression = True
        else:
            actual_col = col_name
            import re
            if re.search(r'[^a-zA-Z0-9_]', actual_col):
                is_expression = True
        
        from app.charts.utils import wrap_query
        
        # Build discovery query for unique values
        is_oracle = "oracle" in datasource.engine.lower()
        is_mysql = "mysql" in datasource.engine.lower() or "starrocks" in datasource.engine.lower()
        alias_keyword = "" if is_oracle else "AS "
        
        # Dialect-specific column identifier
        if is_expression:
            col_identifier = actual_col
        else:
            if is_mysql:
                col_identifier = f"`{actual_col}`"
            elif is_oracle and actual_col.replace('_', '').isalnum():
                col_identifier = actual_col
            else:
                col_identifier = f'"{actual_col}"'

        val_query = f"SELECT DISTINCT {col_identifier} FROM ({base_query.strip().rstrip(';')}) {alias_keyword}val_tab"
        
        where_clauses = []
        if search:
            if is_oracle:
                where_clauses.append(f"UPPER(CAST({col_identifier} AS VARCHAR2(4000))) LIKE UPPER('%{search}%')")
            elif is_mysql:
                where_clauses.append(f"CAST({col_identifier} AS CHAR) LIKE '%{search}%'")
            else:
                where_clauses.append(f"CAST({col_identifier} AS TEXT) ILIKE '%{search}%'")
                
        if applied_filters:
            import json
            try:
                filters_dict = json.loads(applied_filters)
                for f_col, f_val in filters_dict.items():
                    if f_val is None or f_val == '':
                        continue
                    
                    f_db_col = next((c for c in dataset.columns if c.column_name == f_col or c.friendly_name == f_col), None)
                    f_calc_col = next((c for c in dataset.calculated_columns if c.name == f_col or c.expression == f_col), None)
                    
                    f_is_expr = False
                    if f_db_col:
                        f_actual_col = f_db_col.column_name
                    elif f_calc_col:
                        f_actual_col = f_calc_col.expression
                        f_is_expr = True
                    else:
                        f_actual_col = f_col
                        import re
                        if re.search(r'[^a-zA-Z0-9_]', f_actual_col):
                            f_is_expr = True
                            
                    if f_is_expr:
                        f_col_id = f_actual_col
                    else:
                        if is_mysql:
                            f_col_id = f"`{f_actual_col}`"
                        elif is_oracle and f_actual_col.replace('_', '').isalnum():
                            f_col_id = f_actual_col
                        else:
                            f_col_id = f'"{f_actual_col}"'
                        
                    if isinstance(f_val, list):
                        if len(f_val) > 0:
                            in_vals = []
                            has_null = False
                            has_empty = False
                            for v in f_val:
                                if v == '__NULL__':
                                    has_null = True
                                elif v == '__EMPTY__':
                                    has_empty = True
                                else:
                                    safe_v = str(v).replace("'", "''")
                                    in_vals.append(f"'{safe_v}'")
                                    
                            or_conds = []
                            if in_vals:
                                or_conds.append(f"{f_col_id} IN ({','.join(in_vals)})")
                            if has_null:
                                or_conds.append(f"{f_col_id} IS NULL")
                            if has_empty:
                                or_conds.append(f"{f_col_id} = ''")
                                
                            if or_conds:
                                where_clauses.append(f"({' OR '.join(or_conds)})")
                    else:
                        if f_val == '__NULL__':
                            where_clauses.append(f"{f_col_id} IS NULL")
                        elif f_val == '__EMPTY__':
                            where_clauses.append(f"{f_col_id} = ''")
                        else:
                            safe_v = str(f_val).replace("'", "''")
                            where_clauses.append(f"{f_col_id} = '{safe_v}'")
            except Exception as e:
                print(f"Failed to apply filters: {e}")
        
        if where_clauses:
            val_query += f" WHERE {' AND '.join(where_clauses)}"
        
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
            # Check for NULL and empty string values before dropping them
            has_nulls = bool(df[res_col].isnull().any())
            has_empty = bool((df[res_col].astype(str).str.strip() == '').any()) if not df[res_col].isnull().all() else False
            
            # Cast all non-null values to strings for type safety, stripping trailing .0 from whole floats
            is_numeric = pd.api.types.is_numeric_dtype(df[res_col])
            result_data = []
            for v in df[res_col].dropna().tolist():
                s = str(v)
                if is_numeric:
                    try:
                        val_float = float(v)
                        if val_float.is_integer():
                            s = str(int(val_float))
                    except (ValueError, TypeError, OverflowError):
                        pass
                if s.strip() != '':
                    result_data.append(s)
            
            # Append sentinels for NULL and empty string so users can filter for them
            if has_empty:
                result_data.append('__EMPTY__')
            if has_nulls:
                result_data.append('__NULL__')
            
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
