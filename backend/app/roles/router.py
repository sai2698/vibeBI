from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import Role, User
from app.schemas import RoleCreate, RoleResponse, RoleUpdate, PermissionResponse
from app.auth.dependencies import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/roles", tags=["roles"])

@router.post("/", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_in: RoleCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    from app.models import RolePermission
    result = await db.execute(select(Role).where(Role.name == role_in.name))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Role name already registered")
        
    db_role = Role(
        name=role_in.name,
        description=role_in.description
    )
    db.add(db_role)
    await db.flush()
    
    if role_in.permission_ids:
        for perm_id in role_in.permission_ids:
            db.add(RolePermission(role_id=db_role.id, permission_id=perm_id))
    
    await db.commit()
    
    # Reload with relationships
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Role).options(selectinload(Role.permissions)).where(Role.id == db_role.id)
    )
    return result.scalar_one()

@router.get("/", response_model=list[RoleResponse])
async def read_roles(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Role)
        .options(selectinload(Role.permissions))
        .offset(skip).limit(limit)
    )
    roles = result.scalars().all()
    return roles

@router.patch("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    role_in: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    from app.models import RolePermission
    from sqlalchemy import delete
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    update_data = role_in.model_dump(exclude_unset=True)
    permission_ids = update_data.pop("permission_ids", None)
    
    for field, value in update_data.items():
        setattr(role, field, value)
        
    if permission_ids is not None:
        await db.execute(delete(RolePermission).where(RolePermission.role_id == role.id))
        for pid in permission_ids:
            db.add(RolePermission(role_id=role.id, permission_id=pid))
    
    await db.commit()
    
    # Reload with relationships
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Role).options(selectinload(Role.permissions)).where(Role.id == role.id)
    )
    return result.scalar_one()

@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
        
    await db.delete(role)
    await db.commit()
    return None

@router.get("/permissions", response_model=list[PermissionResponse])
async def read_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.models import Permission
    result = await db.execute(select(Permission))
    return result.scalars().all()
