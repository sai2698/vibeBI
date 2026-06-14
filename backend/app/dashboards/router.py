from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import Dashboard, User
from app.schemas import DashboardCreate, DashboardResponse, DashboardUpdate
from app.auth.dependencies import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/dashboards", tags=["dashboards"])

from app.models import Dashboard, User, Role, DashboardFavorite
from app.schemas import DashboardCreate, DashboardResponse, DashboardUpdate
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, and_, exists

@router.post("/", response_model=DashboardResponse, status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    dash_in: DashboardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_dashboard = Dashboard(
        title=dash_in.title,
        description=dash_in.description,
        lob_id=dash_in.lob_id,
        layout=dash_in.layout,
        theme_id=dash_in.theme_id,
        tags=dash_in.tags,
        is_public=dash_in.is_public,
        is_featured=dash_in.is_featured,
        owner_id=current_user.id,
        background_color=dash_in.background_color,
        text_color=dash_in.text_color,
        description_color=dash_in.description_color,
        icon_color=dash_in.icon_color,
        title_font_size=dash_in.title_font_size,
        subtitle_font_size=dash_in.subtitle_font_size,
        logo_size=dash_in.logo_size,
        logo_url=dash_in.logo_url,
        grid_gap=dash_in.grid_gap,
        echarts_theme=dash_in.echarts_theme,
        llm_config=dash_in.llm_config
    )
    
    db_dashboard.roles = []
    if dash_in.role_ids:
        result = await db.execute(select(Role).where(Role.id.in_(dash_in.role_ids)))
        db_dashboard.roles = list(result.scalars().all())
        
    db_dashboard.co_owners = []
    if dash_in.co_owner_ids:
        result = await db.execute(select(User).where(User.id.in_(dash_in.co_owner_ids)))
        db_dashboard.co_owners = list(result.scalars().all())

    db_dashboard.co_owner_roles = []
    if dash_in.co_owner_role_ids:
        result = await db.execute(select(Role).where(Role.id.in_(dash_in.co_owner_role_ids)))
        db_dashboard.co_owner_roles = list(result.scalars().all())
        
    # Default: populated who created it
    if not any(u.id == current_user.id for u in db_dashboard.co_owners):
        db_dashboard.co_owners.append(current_user)
        
    # Default: roles of user who created it
    user_roles = {r.id: r for group in current_user.groups for r in group.roles}
    existing_role_ids = {r.id for r in db_dashboard.roles}
    for r_id, r in user_roles.items():
        if r_id not in existing_role_ids:
            db_dashboard.roles.append(r)

    db.add(db_dashboard)
    await db.commit()
    
    # Reload with roles to avoid lazy-loading error in async context
    result = await db.execute(
        select(Dashboard)
        .options(selectinload(Dashboard.roles), selectinload(Dashboard.owner), selectinload(Dashboard.co_owners), selectinload(Dashboard.co_owner_roles))
        .where(Dashboard.id == db_dashboard.id)
    )
    db_dashboard = result.scalar_one()
    
    # Transform to include role_ids in response
    return {
        "id": db_dashboard.id,
        "title": db_dashboard.title,
        "description": db_dashboard.description,
        "lob_id": db_dashboard.lob_id,
        "layout": db_dashboard.layout,
        "theme_id": db_dashboard.theme_id,
        "tags": db_dashboard.tags,
        "is_public": db_dashboard.is_public,
        "owner_id": db_dashboard.owner_id,
        "owner_name": db_dashboard.owner.full_name if db_dashboard.owner else None,
        "background_color": db_dashboard.background_color,
        "text_color": db_dashboard.text_color,
        "description_color": db_dashboard.description_color,
        "icon_color": db_dashboard.icon_color,
        "title_font_size": db_dashboard.title_font_size,
        "subtitle_font_size": db_dashboard.subtitle_font_size,
        "logo_size": db_dashboard.logo_size,
        "enable_pages": db_dashboard.enable_pages,
        "pages": db_dashboard.pages,
        "filter_presets": db_dashboard.filter_presets,
        "logo_url": db_dashboard.logo_url,
        "grid_gap": db_dashboard.grid_gap,
        "echarts_theme": db_dashboard.echarts_theme,
        "llm_config": db_dashboard.llm_config,
        "cache_config": db_dashboard.cache_config,
        "created_at": db_dashboard.created_at,
        "updated_at": db_dashboard.updated_at,
        "role_ids": [r.id for r in db_dashboard.roles],
        "co_owners": [{"id": str(u.id), "email": u.email, "full_name": u.full_name} for u in db_dashboard.co_owners],
        "co_owner_role_ids": [r.id for r in db_dashboard.co_owner_roles],
        "is_favorite": False
    }

@router.get("/", response_model=list[DashboardResponse])
async def read_dashboards(
    lob_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get user roles
    user_role_ids = [role.id for group in current_user.groups for role in group.roles]
    
    # RBAC logic:
    # 1. No roles attached -> Visible to all
    # 2. Roles attached -> User must have at least one
    # 3. User is owner or admin
    # 4. Dashboard is public
    
    rbac_filters = [
        ~Dashboard.roles.any(), # Case 1
        Dashboard.owner_id == current_user.id, # Case 3 (owner)
        Dashboard.co_owners.any(User.id == current_user.id), # Case 3 (co-owner)
        Dashboard.is_public == True # Case 4
    ]
    
    if user_role_ids:
        rbac_filters.append(Dashboard.roles.any(Role.id.in_(user_role_ids))) # Case 2

    rbac_filter = or_(*rbac_filters)

    query = select(Dashboard).options(
        selectinload(Dashboard.roles),
        selectinload(Dashboard.favorited_by),
        selectinload(Dashboard.owner),
        selectinload(Dashboard.co_owners),
        selectinload(Dashboard.co_owner_roles)
    ).where(rbac_filter)

    if lob_id:
        query = query.where(Dashboard.lob_id == lob_id)
    
    result = await db.execute(query.offset(skip).limit(limit))
    dashboards = result.scalars().all()
    
    # Enrich with is_favorite and role_ids
    enriched = []
    for d in dashboards:
        enriched.append({
            "id": d.id,
            "title": d.title,
            "description": d.description,
            "lob_id": d.lob_id,
            "layout": d.layout,
            "theme_id": d.theme_id,
            "tags": d.tags,
            "is_public": d.is_public,
            "is_featured": d.is_featured,
            "owner_id": d.owner_id,
            "owner_name": d.owner.full_name if d.owner else None,
            "background_color": d.background_color,
            "text_color": d.text_color,
            "description_color": d.description_color,
            "icon_color": d.icon_color,
            "title_font_size": d.title_font_size,
            "subtitle_font_size": d.subtitle_font_size,
            "logo_size": d.logo_size,
            "enable_pages": d.enable_pages,
            "pages": d.pages,
            "filter_presets": d.filter_presets,
            "logo_url": d.logo_url,
            "grid_gap": d.grid_gap,
            "echarts_theme": d.echarts_theme,
            "llm_config": d.llm_config,
            "cache_config": d.cache_config,
            "created_at": d.created_at,
            "updated_at": d.updated_at,
            "is_favorite": any(u.id == current_user.id for u in d.favorited_by),
            "role_ids": [r.id for r in d.roles],
            "co_owners": [{"id": str(u.id), "email": u.email, "full_name": u.full_name} for u in d.co_owners],
            "co_owner_role_ids": [r.id for r in d.co_owner_roles]
        })
    return enriched

@router.get("/{dashboard_id}", response_model=DashboardResponse)
async def read_dashboard(
    dashboard_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(Dashboard)
        .options(selectinload(Dashboard.roles), selectinload(Dashboard.favorited_by), selectinload(Dashboard.owner), selectinload(Dashboard.co_owners), selectinload(Dashboard.co_owner_roles))
        .where(Dashboard.id == dashboard_id)
    )
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    # --- AUDIT LOGGING ---
    from app.audit.utils import is_audit_logging_enabled
    if await is_audit_logging_enabled(db):
        from app.models import AuditLog
        audit_log = AuditLog(
            user_id=current_user.id,
            action="view_dashboard",
            entity_id=str(dashboard.id),
            details={"title": dashboard.title}
        )
        db.add(audit_log)
        await db.commit()
    # ---------------------
        
    return {
        "id": dashboard.id,
        "title": dashboard.title,
        "description": dashboard.description,
        "lob_id": dashboard.lob_id,
        "layout": dashboard.layout,
        "theme_id": dashboard.theme_id,
        "tags": dashboard.tags,
        "is_public": dashboard.is_public,
        "is_featured": dashboard.is_featured,
        "owner_id": dashboard.owner_id,
        "owner_name": dashboard.owner.full_name if dashboard.owner else None,
        "background_color": dashboard.background_color,
        "text_color": dashboard.text_color,
        "description_color": dashboard.description_color,
        "icon_color": dashboard.icon_color,
        "title_font_size": dashboard.title_font_size,
        "subtitle_font_size": dashboard.subtitle_font_size,
        "logo_size": dashboard.logo_size,
        "enable_pages": dashboard.enable_pages,
        "pages": dashboard.pages,
        "filter_config": dashboard.filter_config,
        "filter_presets": dashboard.filter_presets,
        "logo_url": dashboard.logo_url,
        "grid_gap": dashboard.grid_gap,
        "grid_cols": dashboard.grid_cols,
        "row_height": dashboard.row_height,
        "echarts_theme": dashboard.echarts_theme,
        "llm_config": dashboard.llm_config,
        "cache_config": dashboard.cache_config,
        "created_at": dashboard.created_at,
        "updated_at": dashboard.updated_at,
        "is_favorite": any(u.id == current_user.id for u in dashboard.favorited_by),
        "role_ids": [r.id for r in dashboard.roles],
        "co_owners": [{"id": str(u.id), "email": u.email, "full_name": u.full_name} for u in dashboard.co_owners],
        "co_owner_role_ids": [r.id for r in dashboard.co_owner_roles]
    }

@router.patch("/{dashboard_id}", response_model=DashboardResponse)
async def update_dashboard(
    dashboard_id: int,
    dash_in: DashboardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(Dashboard)
        .options(selectinload(Dashboard.roles), selectinload(Dashboard.favorited_by), selectinload(Dashboard.owner), selectinload(Dashboard.co_owners), selectinload(Dashboard.co_owner_roles))
        .where(Dashboard.id == dashboard_id)
    )
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    user_role_ids = {r.id for group in current_user.groups for r in group.roles}
    is_co_owner_by_role = any(r.id in user_role_ids for r in dashboard.co_owner_roles)
    is_co_owner_by_user = any(u.id == current_user.id for u in dashboard.co_owners)
    if dashboard.owner_id != current_user.id and not (is_co_owner_by_user or is_co_owner_by_role):
        raise HTTPException(status_code=403, detail="Only owner or co-owner can update dashboard")

    update_data = dash_in.model_dump(exclude_unset=True)
    
    if "role_ids" in update_data:
        role_ids = update_data.pop("role_ids")
        if role_ids is not None:
            r_result = await db.execute(select(Role).where(Role.id.in_(role_ids)))
            dashboard.roles = r_result.scalars().all()
            
    if "co_owner_ids" in update_data:
        co_owner_ids = update_data.pop("co_owner_ids")
        if co_owner_ids is not None:
            u_result = await db.execute(select(User).where(User.id.in_(co_owner_ids)))
            dashboard.co_owners = u_result.scalars().all()

    if "co_owner_role_ids" in update_data:
        co_owner_role_ids = update_data.pop("co_owner_role_ids")
        if co_owner_role_ids is not None:
            c_result = await db.execute(select(Role).where(Role.id.in_(co_owner_role_ids)))
            dashboard.co_owner_roles = c_result.scalars().all()

    for field, value in update_data.items():
        setattr(dashboard, field, value)

    await db.commit()
    
    # Reload with roles and favorites to avoid lazy-loading error
    result = await db.execute(
        select(Dashboard)
        .options(selectinload(Dashboard.roles), selectinload(Dashboard.favorited_by), selectinload(Dashboard.owner), selectinload(Dashboard.co_owners), selectinload(Dashboard.co_owner_roles))
        .where(Dashboard.id == dashboard.id)
    )
    dashboard = result.scalar_one()
    
    return {
        "id": dashboard.id,
        "title": dashboard.title,
        "description": dashboard.description,
        "lob_id": dashboard.lob_id,
        "layout": dashboard.layout,
        "theme_id": dashboard.theme_id,
        "tags": dashboard.tags,
        "is_public": dashboard.is_public,
        "is_featured": dashboard.is_featured,
        "owner_id": dashboard.owner_id,
        "owner_name": dashboard.owner.full_name if dashboard.owner else None,
        "background_color": dashboard.background_color,
        "text_color": dashboard.text_color,
        "description_color": dashboard.description_color,
        "icon_color": dashboard.icon_color,
        "title_font_size": dashboard.title_font_size,
        "subtitle_font_size": dashboard.subtitle_font_size,
        "logo_size": dashboard.logo_size,
        "enable_pages": dashboard.enable_pages,
        "pages": dashboard.pages,
        "filter_config": dashboard.filter_config,
        "filter_presets": dashboard.filter_presets,
        "logo_url": dashboard.logo_url,
        "grid_gap": dashboard.grid_gap,
        "grid_cols": dashboard.grid_cols,
        "row_height": dashboard.row_height,
        "echarts_theme": dashboard.echarts_theme,
        "llm_config": dashboard.llm_config,
        "cache_config": dashboard.cache_config,
        "created_at": dashboard.created_at,
        "updated_at": dashboard.updated_at,
        "is_favorite": any(u.id == current_user.id for u in dashboard.favorited_by),
        "role_ids": [r.id for r in dashboard.roles],
        "co_owners": [{"id": str(u.id), "email": u.email, "full_name": u.full_name} for u in dashboard.co_owners],
        "co_owner_role_ids": [r.id for r in dashboard.co_owner_roles]
    }

@router.post("/{dashboard_id}/favorite", status_code=status.HTTP_200_OK)
async def toggle_favorite(
    dashboard_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(DashboardFavorite)
        .where(DashboardFavorite.dashboard_id == dashboard_id, DashboardFavorite.user_id == current_user.id)
    )
    favorite = result.scalar_one_or_none()
    
    if favorite:
        await db.delete(favorite)
        await db.commit()
        return {"is_favorite": False}
    else:
        new_fav = DashboardFavorite(user_id=current_user.id, dashboard_id=dashboard_id)
        db.add(new_fav)
        await db.commit()
        return {"is_favorite": True}

@router.delete("/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(
    dashboard_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(Dashboard)
        .options(selectinload(Dashboard.co_owners), selectinload(Dashboard.co_owner_roles))
        .where(Dashboard.id == dashboard_id)
    )
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    user_role_ids = {r.id for group in current_user.groups for r in group.roles}
    is_co_owner_by_role = any(r.id in user_role_ids for r in dashboard.co_owner_roles)
    is_co_owner_by_user = any(u.id == current_user.id for u in dashboard.co_owners)
    if dashboard.owner_id != current_user.id and not (is_co_owner_by_user or is_co_owner_by_role):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    await db.delete(dashboard)
    await db.commit()
    return None

@router.post("/{dashboard_id}/clear-cache", status_code=status.HTTP_200_OK)
async def clear_dashboard_cache(
    dashboard_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Clear all Redis cache entries associated with a specific dashboard."""
    from app.cache import clear_namespace
    
    # We don't strictly require the user to be the owner to clear the cache,
    # as any user viewing the dashboard might want to force refresh it.
    # But we should verify the dashboard exists and the user has access.
    
    result = await db.execute(select(Dashboard).where(Dashboard.id == dashboard_id))
    dashboard = result.scalar_one_or_none()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    pattern = f"dashboard:{dashboard_id}:*"
    deleted_count = await clear_namespace(pattern)
    
    return {"message": f"Cache cleared successfully. Removed {deleted_count} entries.", "deleted_count": deleted_count}
