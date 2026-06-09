from datetime import timedelta
import json
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Dashboard, Chart, Dataset, Datasource, User
from app.auth.security import verify_password, create_access_token
from app.config import settings

# Prefix with /api/v1 to mimic Apache Superset's REST API endpoint structure
router = APIRouter(prefix="/api/v1", tags=["openmetadata"])


class LoginRequest(BaseModel):
    username: str
    password: str
    provider: str = "db"


def mask_uri(uri: str) -> str:
    """Mask credentials in SQLAlchemy URIs for security purposes."""
    if not uri:
        return ""
    # E.g., postgresql://user:password@host:port/dbname
    match = re.match(r"^([^:]+://[^:]+:)([^@]+)(@.*)$", uri)
    if match:
        return match.group(1) + "********" + match.group(3)
    return uri


def extract_chart_ids(layout: Any) -> List[int]:
    """Recursively traverse the vibeBI layout JSON to extract all associated chart IDs."""
    chart_ids = []
    if not layout:
        return chart_ids

    def traverse(node):
        if isinstance(node, dict):
            chart_id = node.get("chart_id") or node.get("chartId")
            if chart_id is not None:
                try:
                    chart_ids.append(int(chart_id))
                except (ValueError, TypeError):
                    pass
            for value in node.values():
                traverse(value)
        elif isinstance(node, list):
            for item in node:
                traverse(item)

    traverse(layout)
    return list(set(chart_ids))


def get_owners_list(owner_user: Optional[User], co_owners: List[User]) -> List[Dict[str, Any]]:
    """Convert vibeBI dashboard owners to Superset-style owners payload."""
    owners = []
    seen = set()
    users_to_add = []
    if owner_user:
        users_to_add.append(owner_user)
    if co_owners:
        users_to_add.extend(co_owners)

    for u in users_to_add:
        if u.id not in seen:
            seen.add(u.id)
            name_parts = (u.full_name or "").split(" ", 1)
            first_name = name_parts[0] if len(name_parts) > 0 else ""
            last_name = name_parts[1] if len(name_parts) > 1 else ""
            owners.append({
                "id": str(u.id),
                "username": u.email,
                "first_name": first_name,
                "last_name": last_name
            })
    return owners


@router.post("/security/login")
async def security_login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate a user and return a JWT access token for OpenMetadata."""
    result = await db.execute(select(User).where(User.email == req.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    return {"access_token": access_token}


@router.get("/security/csrf")
async def security_csrf():
    """Return a dummy CSRF token for compatibility with Superset API clients."""
    return {"result": "dummy_csrf_token"}


@router.get("/dashboard/")
async def list_dashboards(db: AsyncSession = Depends(get_db)):
    """List all dashboards in vibeBI format wrapped in a Superset-style result list."""
    result = await db.execute(
        select(Dashboard)
        .options(selectinload(Dashboard.owner), selectinload(Dashboard.co_owners))
    )
    dashboards = result.scalars().all()

    result_list = []
    for d in dashboards:
        chart_ids = extract_chart_ids(d.layout)

        # Build mock position_json representation for OpenMetadata to extract chart IDs
        position_data = {"DASHBOARD_VERSION_KEY": "v2"}
        for cid in chart_ids:
            ck = f"CHART-{cid}"
            position_data[ck] = {
                "type": "CHART",
                "id": ck,
                "meta": {
                    "chartId": cid,
                    "sliceName": f"Chart {cid}"
                }
            }

        result_list.append({
            "id": d.id,
            "dashboard_title": d.title,
            "slug": str(d.id),
            "published": d.is_public,
            "position_json": json.dumps(position_data),
            "owners": get_owners_list(d.owner, d.co_owners)
        })

    return {"count": len(result_list), "result": result_list}


@router.get("/dashboard/{dashboard_id}")
async def get_dashboard(dashboard_id: int, db: AsyncSession = Depends(get_db)):
    """Get details of a single dashboard."""
    result = await db.execute(
        select(Dashboard)
        .options(selectinload(Dashboard.owner), selectinload(Dashboard.co_owners))
        .where(Dashboard.id == dashboard_id)
    )
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    chart_ids = extract_chart_ids(d.layout)
    position_data = {"DASHBOARD_VERSION_KEY": "v2"}
    for cid in chart_ids:
        ck = f"CHART-{cid}"
        position_data[ck] = {
            "type": "CHART",
            "id": ck,
            "meta": {
                "chartId": cid,
                "sliceName": f"Chart {cid}"
            }
        }

    return {
        "id": d.id,
        "result": {
            "id": d.id,
            "dashboard_title": d.title,
            "slug": str(d.id),
            "published": d.is_public,
            "position_json": json.dumps(position_data),
            "owners": get_owners_list(d.owner, d.co_owners)
        }
    }


@router.get("/dashboard/{dashboard_id}/charts")
async def get_dashboard_charts(dashboard_id: int, db: AsyncSession = Depends(get_db)):
    """Get the list of charts placed inside a specific dashboard."""
    result = await db.execute(select(Dashboard).where(Dashboard.id == dashboard_id))
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    chart_ids = extract_chart_ids(d.layout)
    if not chart_ids:
        return {"count": 0, "result": []}

    charts_result = await db.execute(select(Chart).where(Chart.id.in_(chart_ids)))
    charts = charts_result.scalars().all()

    result_list = []
    for c in charts:
        result_list.append({
            "id": c.id,
            "slice_name": c.title or f"Chart {c.id}",
            "viz_type": c.chart_type,
            "datasource_id": c.dataset_id,
            "datasource_type": "table",
            "description": ""
        })

    return {"count": len(result_list), "result": result_list}


@router.get("/chart/")
async def list_charts(db: AsyncSession = Depends(get_db)):
    """List all charts in vibeBI."""
    result = await db.execute(select(Chart))
    charts = result.scalars().all()

    result_list = []
    for c in charts:
        result_list.append({
            "id": c.id,
            "slice_name": c.title or f"Chart {c.id}",
            "viz_type": c.chart_type,
            "datasource_id": c.dataset_id,
            "datasource_type": "table",
            "description": ""
        })

    return {"count": len(result_list), "result": result_list}


@router.get("/chart/{chart_id}")
async def get_chart(chart_id: int, db: AsyncSession = Depends(get_db)):
    """Get details of a single chart."""
    result = await db.execute(select(Chart).where(Chart.id == chart_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Chart not found")

    return {
        "id": c.id,
        "result": {
            "id": c.id,
            "slice_name": c.title or f"Chart {c.id}",
            "viz_type": c.chart_type,
            "datasource_id": c.dataset_id,
            "datasource_type": "table",
            "description": ""
        }
    }


@router.get("/dataset/")
async def list_datasets(db: AsyncSession = Depends(get_db)):
    """List all datasets in vibeBI."""
    result = await db.execute(select(Dataset))
    datasets = result.scalars().all()

    # Pre-fetch all datasources to map database name mapping
    ds_result = await db.execute(select(Datasource))
    datasources = {ds.id: ds for ds in ds_result.scalars().all()}

    result_list = []
    for d in datasets:
        ds = datasources.get(d.datasource_id) if d.datasource_id else None
        db_info = {
            "id": ds.id if ds else 0,
            "database_name": ds.name if ds else "vibeBI_default",
            "backend": ds.engine if ds else "sqlite"
        }

        result_list.append({
            "id": d.id,
            "table_name": d.table_name or d.name,
            "schema_name": d.schema_name or "public",
            "database": db_info
        })

    return {"count": len(result_list), "result": result_list}


@router.get("/dataset/{dataset_id}")
async def get_dataset(dataset_id: int, db: AsyncSession = Depends(get_db)):
    """Get details of a single dataset including column schemas, custom SQL, and metrics."""
    result = await db.execute(
        select(Dataset)
        .options(
            selectinload(Dataset.columns),
            selectinload(Dataset.metrics),
            selectinload(Dataset.calculated_columns)
        )
        .where(Dataset.id == dataset_id)
    )
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Dataset not found")

    ds = None
    if d.datasource_id:
        ds_result = await db.execute(select(Datasource).where(Datasource.id == d.datasource_id))
        ds = ds_result.scalar_one_or_none()

    db_info = {
        "id": ds.id if ds else 0,
        "database_name": ds.name if ds else "vibeBI_default",
        "backend": ds.engine if ds else "sqlite"
    }

    # Map physical and calculated columns
    columns_list = []
    for col in d.columns:
        columns_list.append({
            "column_name": col.column_name,
            "type": col.data_type or "VARCHAR",
            "description": col.description or ""
        })
    for cc in d.calculated_columns:
        columns_list.append({
            "column_name": cc.name,
            "type": cc.data_type or "VARCHAR",
            "description": cc.description or f"Calculated column: {cc.expression}"
        })

    # Map dataset metrics
    metrics_list = []
    for m in d.metrics:
        metrics_list.append({
            "metric_name": m.name,
            "expression": m.expression,
            "description": m.description or ""
        })

    result_data = {
        "id": d.id,
        "table_name": d.table_name or d.name,
        "schema_name": d.schema_name or "public",
        "database": db_info,
        "columns": columns_list,
        "metrics": metrics_list
    }

    # Include custom SQL configuration for custom query datasets (virtual datasets)
    if d.dataset_type == "sql" and d.custom_sql:
        result_data["sql"] = d.custom_sql

    return {
        "id": d.id,
        "result": result_data
    }


@router.get("/database/")
async def list_databases(db: AsyncSession = Depends(get_db)):
    """List all databases (datasources) in vibeBI with connection credentials masked."""
    result = await db.execute(select(Datasource))
    datasources = result.scalars().all()

    result_list = []
    for ds in datasources:
        result_list.append({
            "id": ds.id,
            "database_name": ds.name,
            "backend": ds.engine,
            "sqlalchemy_uri": mask_uri(ds.connection_uri)
        })

    return {"count": len(result_list), "result": result_list}


@router.get("/database/{database_id}")
async def get_database(database_id: int, db: AsyncSession = Depends(get_db)):
    """Get details of a single database."""
    result = await db.execute(select(Datasource).where(Datasource.id == database_id))
    ds = result.scalar_one_or_none()
    if not ds:
        raise HTTPException(status_code=404, detail="Database not found")

    return {
        "id": ds.id,
        "result": {
            "id": ds.id,
            "database_name": ds.name,
            "backend": ds.engine,
            "sqlalchemy_uri": mask_uri(ds.connection_uri)
        }
    }
