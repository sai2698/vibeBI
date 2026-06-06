from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.database import get_db
from app.models import AuditLog, User, SystemSetting
from pydantic import BaseModel
from app.schemas import AuditLogListResponse
from app.auth.dependencies import get_current_admin_user

router = APIRouter(prefix="/api/audit-logs", tags=["audit-logs"])

class AuditSettingsUpdate(BaseModel):
    audit_logging_enabled: Optional[bool] = None
    audit_log_retention_days: Optional[int] = None

@router.get("/settings")
async def get_audit_settings(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    res = await db.execute(select(SystemSetting).where(SystemSetting.key.in_(["audit_logging_enabled", "audit_log_retention_days"])))
    settings_records = res.scalars().all()
    
    # Defaults
    settings_dict = {
        "audit_logging_enabled": True,
        "audit_log_retention_days": 30
    }
    
    for record in settings_records:
        if record.key == "audit_logging_enabled":
            settings_dict[record.key] = record.value.lower() == "true"
        elif record.key == "audit_log_retention_days":
            try:
                settings_dict[record.key] = int(record.value)
            except ValueError:
                pass
                
    return settings_dict

@router.post("/settings")
async def update_audit_settings(
    settings_update: AuditSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    updates = {}
    if settings_update.audit_logging_enabled is not None:
        updates["audit_logging_enabled"] = "true" if settings_update.audit_logging_enabled else "false"
        
    if settings_update.audit_log_retention_days is not None:
        if settings_update.audit_log_retention_days < 1:
            raise HTTPException(status_code=400, detail="Retention days must be at least 1")
        updates["audit_log_retention_days"] = str(settings_update.audit_log_retention_days)
        
    for key, value in updates.items():
        res = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
        setting = res.scalar_one_or_none()
        
        if setting:
            setting.value = value
        else:
            new_setting = SystemSetting(key=key, value=value, description=f"Audit log setting: {key}")
            db.add(new_setting)
            
    await db.commit()
    return {"status": "success"}

@router.get("/", response_model=AuditLogListResponse)
async def get_audit_logs(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    action: Optional[List[str]] = Query(None),
    user_id: Optional[List[UUID]] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    # Base queries
    query = select(AuditLog).options(selectinload(AuditLog.user))
    count_query = select(func.count()).select_from(AuditLog)
    
    # Filters
    filters = []
    if start_date:
        filters.append(AuditLog.created_at >= start_date)
    if end_date:
        filters.append(AuditLog.created_at <= end_date)
    if action:
        filters.append(AuditLog.action.in_(action))
    if user_id:
        filters.append(AuditLog.user_id.in_(user_id))
        
    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))
        
    # Execute count
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0
    
    # Execute paginated query
    query = query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit)
    logs_res = await db.execute(query)
    logs = logs_res.scalars().all()
    
    # Format response mapping user to email/name
    items = []
    for log in logs:
        items.append({
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "entity_id": log.entity_id,
            "details": log.details,
            "created_at": log.created_at,
            "user_email": log.user.email if log.user else None,
            "user_name": log.user.full_name if log.user else None
        })
        
    return {"items": items, "total": total}
