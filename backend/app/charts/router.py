from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Chart, User
from app.schemas import ChartCreate, ChartResponse, ChartPreviewRequest, ChartDataRequest
from app.auth.dependencies import get_current_active_user, has_permission
from starlette.concurrency import run_in_threadpool
from app.datasources.pool import ds_pool

router = APIRouter(prefix="/api/charts", tags=["charts"])

@router.post("/", response_model=ChartResponse, status_code=status.HTTP_201_CREATED)
async def create_chart(
    chart_in: ChartCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:chart_builder"))
):
    db_chart = Chart(
        title=chart_in.title,
        chart_type=chart_in.chart_type,
        dataset_id=chart_in.dataset_id,
        query_config=chart_in.query_config,
        visual_config=chart_in.visual_config,
        lob_id=chart_in.lob_id,
        folder_id=chart_in.folder_id,
        tags=chart_in.tags,
        owner_id=current_user.id
    )
    db.add(db_chart)
    await db.commit()
    await db.refresh(db_chart)
    return db_chart

@router.get("/", response_model=list[ChartResponse])
async def read_charts(
    lob_id: Optional[int] = None,
    chart_type: Optional[str] = None,
    exclude_chart_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Chart).where(Chart.owner_id == current_user.id)
    if lob_id:
        query = query.where(Chart.lob_id == lob_id)
    if chart_type:
        query = query.where(Chart.chart_type == chart_type)
    if exclude_chart_type:
        query = query.where(Chart.chart_type != exclude_chart_type)
        
    result = await db.execute(query.offset(skip).limit(limit))
    charts = result.scalars().all()
    return charts

@router.get("/{chart_id}", response_model=ChartResponse)
async def read_chart(
    chart_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(Chart).where(Chart.id == chart_id))
    chart = result.scalar_one_or_none()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    return chart

@router.post("/{chart_id}/duplicate", response_model=ChartResponse)
async def duplicate_chart(
    chart_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("menu:chart_builder"))
):
    result = await db.execute(select(Chart).where(Chart.id == chart_id))
    chart = result.scalar_one_or_none()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    
    # Check permissions
    if chart.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can duplicate this chart")

    # Create a copy
    new_chart = Chart(
        title=f"{chart.title} (Copy)",
        chart_type=chart.chart_type,
        dataset_id=chart.dataset_id,
        query_config=chart.query_config,
        visual_config=chart.visual_config,
        lob_id=chart.lob_id,
        folder_id=chart.folder_id,
        tags=chart.tags,
        owner_id=current_user.id
    )
    db.add(new_chart)
    await db.commit()
    await db.refresh(new_chart)
    return new_chart

from app.models import Chart, User, Dashboard
from sqlalchemy import cast, String

@router.patch("/{chart_id}", response_model=ChartResponse)
async def update_chart(
    chart_id: int,
    chart_in: Dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(Chart).where(Chart.id == chart_id))
    chart = result.scalar_one_or_none()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    
    # Ownership check
    if chart.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can update this chart")

    # Simple partial update
    for key, value in chart_in.items():
        if hasattr(chart, key):
            setattr(chart, key, value)
            
    await db.commit()
    await db.refresh(chart)
    return chart

@router.delete("/{chart_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chart(
    chart_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(Chart).where(Chart.id == chart_id))
    chart = result.scalar_one_or_none()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    
    # Ownership check
    if chart.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this chart")

    # Check if used in any dashboard
    # Postgres JSONB check: dashboards where layout contains an object with chart_id
    # Using text search or jsonb path might be better, but @> is reliable for exact match in array
    # layout @> '[{"chart_id": 1}]'
    # In SQLAlchemy async, we can use Dashboard.layout.contains([{"chart_id": chart_id}])
    from sqlalchemy import text
    usage_query = select(Dashboard.title).where(
        Dashboard.layout.contains([{"chart_id": chart_id}])
    )
    usage_result = await db.execute(usage_query)
    dashboards_using = usage_result.scalars().all()
    
    if dashboards_using:
        titles = ", ".join(dashboards_using)
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete chart. It is used in the following dashboards: {titles}"
        )

    await db.delete(chart)
    await db.commit()
    return None

import pandas as pd
from sqlalchemy import text, create_engine
from app.models import Dataset, Datasource, DatasetColumn, DatasetMetric

@router.post("/{chart_id}/data")
async def get_chart_data(
    chart_id: int,
    req: ChartDataRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Return actual data for a chart based on its query_config and optional filters."""
    from .utils import build_sql_query, get_sync_uri
    from app.rls.utils import get_applicable_rls_clauses
    from app.cache import get_cache, set_cache
    import hashlib
    import json
    result = await db.execute(select(Chart).where(Chart.id == chart_id))
    chart = result.scalar_one_or_none()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    if chart.dataset_id is None and not req.datamart_id and chart.chart_type == 'custom':
        # Custom chart with no dataset
        return {
            "chart_id": chart_id,
            "chart_type": chart.chart_type,
            "sql": None,
            "data": [],
            "columns": [],
            "query_config": chart.query_config,
            "visual_config": chart.visual_config,
            "title": chart.title
        }

    sql_str = ""
    datasource = None

    query_config = req.query_config if req.query_config is not None else (chart.query_config or {})

    # Merge chart's default_filters with incoming request filters
    # Request filters (from dashboard) take precedence over chart default filters
    merged_filters = dict(query_config.get('default_filters', {}) or {})
    if req.filters:
        for key, value in req.filters.items():
            if value is not None and value != '' and value != []:
                merged_filters[key] = value

    if req.datamart_id:
        from app.models import DataMart, DatasetJoin
        from sqlalchemy import or_
        
        result = await db.execute(
            select(DataMart)
            .options(selectinload(DataMart.datasets).selectinload(Dataset.columns),
                     selectinload(DataMart.datasets).selectinload(Dataset.metrics))
            .where(DataMart.id == req.datamart_id)
        )
        datamart = result.scalar_one_or_none()
        if not datamart:
            raise HTTPException(status_code=404, detail="Datamart not found")
            
        datasets = {ds.id: ds for ds in datamart.datasets}
        if not datasets:
            return {"data": [], "error": "No datasets in this datamart"}
            
        ds_ids = list(datasets.keys())
        joins_res = await db.execute(
            select(DatasetJoin).where(
                or_(DatasetJoin.left_dataset_id.in_(ds_ids), DatasetJoin.right_dataset_id.in_(ds_ids))
            )
        )
        joins = joins_res.scalars().all()
        
        datasource_id = list(datasets.values())[0].datasource_id
        result = await db.execute(select(Datasource).where(Datasource.id == datasource_id))
        datasource = result.scalar_one_or_none()
        if not datasource:
            raise HTTPException(status_code=404, detail="Datasource not found")
        
        rls_clauses = await get_applicable_rls_clauses(db, ds_ids, current_user, datasource.engine)
        sql_str, cols, applied_joins_info, has_missing_joins, join_warnings, sql_options = build_sql_query(
            datasets, query_config, filters=merged_filters, engine_type=datasource.engine, joins=joins, rls_clauses=rls_clauses
        )
    else:
        result = await db.execute(
            select(Dataset)
            .options(selectinload(Dataset.columns), selectinload(Dataset.metrics), selectinload(Dataset.calculated_columns))
            .where(Dataset.id == chart.dataset_id)
        )
        dataset = result.scalar_one_or_none()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        result = await db.execute(select(Datasource).where(Datasource.id == dataset.datasource_id))
        datasource = result.scalar_one_or_none()
        if not datasource:
            raise HTTPException(status_code=404, detail="Datasource not found")

        rls_clauses = await get_applicable_rls_clauses(db, [dataset.id], current_user, datasource.engine)
        sql_str, cols, applied_joins_info, has_missing_joins, join_warnings, sql_options = build_sql_query(
            dataset, query_config, filters=merged_filters, engine_type=datasource.engine, rls_clauses=rls_clauses
        )

    if not sql_str:
        return {"chart_id": chart_id, "data": [], "error": "No dimensions or metrics selected"}

    # --- CACHE CHECK ---
    cache_key = None
    cache_ttl = None
    if req.dashboard_id:
        from app.models import Dashboard
        dash_res = await db.execute(select(Dashboard).where(Dashboard.id == req.dashboard_id))
        dashboard = dash_res.scalar_one_or_none()
        if dashboard and dashboard.cache_config and dashboard.cache_config.get("enable_chart_cache", False):
            cache_ttl = int(dashboard.cache_config.get("chart_ttl", 3600))
            # Create a unique hash for the query payload
            payload_str = json.dumps({"q": query_config, "f": merged_filters, "u": str(current_user.id)}, sort_keys=True)
            payload_hash = hashlib.md5(payload_str.encode()).hexdigest()
            cache_key = f"dashboard:{req.dashboard_id}:chart:{chart_id}:{payload_hash}"
            
            cached_data = await get_cache(cache_key)
            if cached_data:
                # Merge fresh chart metadata into cached data to avoid stale UI
                cached_data["title"] = chart.title
                cached_data["visual_config"] = chart.visual_config
                cached_data["chart_type"] = chart.chart_type
                return cached_data

    try:
        import time
        start_time = time.time()
        
        impersonate = datasource.advanced_properties.get("impersonate_user", False) if datasource.advanced_properties else False
        engine = ds_pool.get_engine(get_sync_uri(datasource.connection_uri), current_user.email if impersonate else None)
        df = await run_in_threadpool(pd.read_sql_query, text(sql_str), engine)
        
        execution_time_ms = int((time.time() - start_time) * 1000)
        
        from .utils import deduplicate_dataframe_columns
        df = deduplicate_dataframe_columns(df)
        df = df.astype(object).where(pd.notnull(df), None)
        data_list = df.to_dict(orient="records")
        
        # --- AUDIT LOGGING ---
        from app.audit.utils import is_audit_logging_enabled
        if await is_audit_logging_enabled(db):
            from app.models import AuditLog
            audit_log = AuditLog(
                user_id=current_user.id,
                action="execute_chart",
                entity_id=str(req.dashboard_id) if req.dashboard_id else str(chart_id),
                details={
                    "chart_id": chart_id,
                    "dashboard_id": req.dashboard_id,
                    "dashboard_name": req.dashboard_name,
                    "filters": req.filters,
                    "executed_sql": sql_str,
                    "execution_time_ms": execution_time_ms,
                    "status": "success",
                    "row_count": len(data_list)
                }
            )
            db.add(audit_log)
            await db.commit()
        # ---------------------
        
        result_payload = {
            "chart_id": chart_id,
            "chart_type": chart.chart_type,
            "sql": sql_str,
            "data": data_list,
            "columns": list(df.columns),
            "query_config": query_config,
            "visual_config": chart.visual_config,
            "title": chart.title,
            "applied_joins": applied_joins_info,
            "has_missing_joins": has_missing_joins,
            "join_warnings": join_warnings
        }

        if cache_key and cache_ttl:
            await set_cache(cache_key, result_payload, cache_ttl)

        return result_payload
    except Exception as e:
        # --- AUDIT LOGGING (ERROR) ---
        from app.audit.utils import is_audit_logging_enabled
        if await is_audit_logging_enabled(db):
            from app.models import AuditLog
            audit_log = AuditLog(
                user_id=current_user.id,
                action="execute_chart",
                entity_id=str(req.dashboard_id) if req.dashboard_id else str(chart_id),
                details={
                    "chart_id": chart_id,
                    "dashboard_id": req.dashboard_id,
                    "dashboard_name": req.dashboard_name,
                    "filters": req.filters,
                    "executed_sql": sql_str,
                    "status": "error",
                    "error_message": str(e)
                }
            )
            db.add(audit_log)
            await db.commit()
        # -----------------------------
        
        raise HTTPException(status_code=400, detail=f"Query execution failed: {e}")

@router.post("/preview")
async def preview_chart_data(
    req: ChartPreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Preview data for a potential chart configuration."""
    from .utils import build_sql_query, get_sync_uri
    from app.rls.utils import get_applicable_rls_clauses
    
    sql_str = ""
    datasource = None
    
    if req.datamart_id:
        from app.models import DataMart, DatasetJoin
        from sqlalchemy import or_
        
        result = await db.execute(
            select(DataMart)
            .options(selectinload(DataMart.datasets).selectinload(Dataset.columns),
                     selectinload(DataMart.datasets).selectinload(Dataset.metrics),
                     selectinload(DataMart.datasets).selectinload(Dataset.calculated_columns))
            .where(DataMart.id == req.datamart_id)
        )
        datamart = result.scalar_one_or_none()
        if not datamart:
            raise HTTPException(status_code=404, detail="Datamart not found")
            
        datasets = {ds.id: ds for ds in datamart.datasets}
        if not datasets:
            return {"data": [], "error": "No datasets in this datamart"}
            
        ds_ids = list(datasets.keys())
        joins_res = await db.execute(
            select(DatasetJoin).where(
                or_(DatasetJoin.left_dataset_id.in_(ds_ids), DatasetJoin.right_dataset_id.in_(ds_ids))
            )
        )
        joins = joins_res.scalars().all()
        
        datasource_id = list(datasets.values())[0].datasource_id
        result = await db.execute(select(Datasource).where(Datasource.id == datasource_id))
        datasource = result.scalar_one_or_none()
        if not datasource:
            raise HTTPException(status_code=404, detail="Datasource not found")
        
        rls_clauses = await get_applicable_rls_clauses(db, ds_ids, current_user, datasource.engine)
        sql_str, cols, applied_joins_info, has_missing_joins, join_warnings, sql_options = build_sql_query(
            datasets, req.query_config or {}, filters=req.filters, engine_type=datasource.engine, joins=joins, rls_clauses=rls_clauses
        )
    else:
        dataset_id = req.dataset_id
        result = await db.execute(
            select(Dataset)
            .options(selectinload(Dataset.columns), selectinload(Dataset.metrics), selectinload(Dataset.calculated_columns))
            .where(Dataset.id == dataset_id)
        )
        dataset = result.scalar_one_or_none()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        result = await db.execute(select(Datasource).where(Datasource.id == dataset.datasource_id))
        datasource = result.scalar_one_or_none()
        if not datasource:
            raise HTTPException(status_code=404, detail="Datasource not found")

        rls_clauses = await get_applicable_rls_clauses(db, [dataset.id], current_user, datasource.engine)
        sql_str, cols, applied_joins_info, has_missing_joins, join_warnings, sql_options = build_sql_query(
            dataset, req.query_config or {}, filters=req.filters, engine_type=datasource.engine, rls_clauses=rls_clauses
        )

    if not sql_str:
        return {"data": [], "error": "No dimensions or metrics selected"}

    try:
        import time
        start_time = time.time()
        
        impersonate = datasource.advanced_properties.get("impersonate_user", False) if datasource.advanced_properties else False
        engine = ds_pool.get_engine(get_sync_uri(datasource.connection_uri), current_user.email if impersonate else None)
        df = await run_in_threadpool(pd.read_sql_query, text(sql_str), engine)
        
        execution_time_ms = int((time.time() - start_time) * 1000)
        
        from .utils import deduplicate_dataframe_columns
        df = deduplicate_dataframe_columns(df)
        df = df.astype(object).where(pd.notnull(df), None)
        data_list = df.to_dict(orient="records")
        
        # --- AUDIT LOGGING ---
        if req.datamart_id:
            from app.audit.utils import is_audit_logging_enabled
            if await is_audit_logging_enabled(db):
                from app.models import AuditLog
                audit_log = AuditLog(
                    user_id=current_user.id,
                    action="query_datamart",
                    entity_id=str(req.datamart_id),
                    details={
                        "filters": req.filters,
                        "query_config": req.query_config,
                        "executed_sql": sql_str,
                        "execution_time_ms": execution_time_ms,
                        "status": "success",
                        "row_count": len(data_list)
                    }
                )
                db.add(audit_log)
                await db.commit()
        # ---------------------
        
        return {
            "sql": sql_str,
            "data": data_list,
            "columns": list(df.columns),
            "applied_joins": applied_joins_info,
            "has_missing_joins": has_missing_joins,
            "join_warnings": join_warnings
        }
        
    except Exception as e:
        # --- AUDIT LOGGING (ERROR) ---
        if req.datamart_id:
            from app.audit.utils import is_audit_logging_enabled
            if await is_audit_logging_enabled(db):
                from app.models import AuditLog
                audit_log = AuditLog(
                    user_id=current_user.id,
                    action="query_datamart",
                    entity_id=str(req.datamart_id),
                    details={
                        "filters": req.filters,
                        "query_config": req.query_config,
                        "executed_sql": sql_str,
                        "status": "error",
                        "error_message": str(e)
                    }
                )
                db.add(audit_log)
                await db.commit()
        # -----------------------------
        
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")

@router.post("/generate-sql")
async def generate_chart_sql(
    req: ChartPreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate SQL query without executing it (for preview purposes)."""
    from .utils import build_sql_query, get_sync_uri
    from app.rls.utils import get_applicable_rls_clauses
    
    sql_str = ""
    
    if req.datamart_id:
        from app.models import DataMart, DatasetJoin, Datasource
        from sqlalchemy import or_
        
        result = await db.execute(
            select(DataMart)
            .options(selectinload(DataMart.datasets).selectinload(Dataset.columns),
                     selectinload(DataMart.datasets).selectinload(Dataset.metrics),
                     selectinload(DataMart.datasets).selectinload(Dataset.calculated_columns))
            .where(DataMart.id == req.datamart_id)
        )
        datamart = result.scalar_one_or_none()
        if not datamart:
            raise HTTPException(status_code=404, detail="Datamart not found")
            
        datasets = {ds.id: ds for ds in datamart.datasets}
        if not datasets:
            return {"sql": "", "error": "No datasets in this datamart"}
            
        ds_ids = list(datasets.keys())
        joins_res = await db.execute(
            select(DatasetJoin).where(
                or_(DatasetJoin.left_dataset_id.in_(ds_ids), DatasetJoin.right_dataset_id.in_(ds_ids))
            )
        )
        joins = joins_res.scalars().all()
        
        datasource_id = list(datasets.values())[0].datasource_id
        result = await db.execute(select(Datasource).where(Datasource.id == datasource_id))
        datasource = result.scalar_one_or_none()
        if not datasource:
            raise HTTPException(status_code=404, detail="Datasource not found")
        
        rls_clauses = await get_applicable_rls_clauses(db, ds_ids, current_user, datasource.engine)
        sql_str, cols, applied_joins_info, has_missing_joins, join_warnings, sql_options = build_sql_query(
            datasets, 
            req.query_config or {}, 
            filters=req.filters, 
            engine_type=datasource.engine,
            joins=joins, 
            rls_clauses=rls_clauses
        )
    else:
        raise HTTPException(status_code=400, detail="datamart_id is required")

    if not sql_str:
        return {"sql": "", "error": "No dimensions or metrics selected"}
    
    return {
        "sql": sql_str,
        "columns": cols,
        "applied_joins": applied_joins_info,
        "has_missing_joins": has_missing_joins,
        "join_warnings": join_warnings
    }
