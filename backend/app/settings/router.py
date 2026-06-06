from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import LDAPConfig, User
from app.schemas import LDAPConfigResponse, LDAPConfigUpdate
from app.auth.dependencies import has_permission

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("/ldap", response_model=LDAPConfigResponse)
async def get_ldap_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("admin:all"))
):
    result = await db.execute(select(LDAPConfig).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        # Create default if not exists
        config = LDAPConfig()
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config

@router.patch("/ldap", response_model=LDAPConfigResponse)
async def update_ldap_config(
    update_data: LDAPConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(has_permission("admin:all"))
):
    result = await db.execute(select(LDAPConfig).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        config = LDAPConfig()
        db.add(config)
    
    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(config, key, value)
    
    await db.commit()
    await db.refresh(config)
    return config
