from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import Group, User, Role
from app.schemas import GroupCreate, GroupResponse, GroupUpdate
from app.auth.dependencies import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/groups", tags=["groups"])

@router.post("/", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_in: GroupCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    from app.models import GroupRole
    result = await db.execute(select(Group).where(Group.name == group_in.name))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Group name already registered")
        
    db_group = Group(
        name=group_in.name,
        description=group_in.description
    )
    db.add(db_group)
    await db.flush()
    
    if group_in.role_ids:
        for role_id in group_in.role_ids:
            db.add(GroupRole(group_id=db_group.id, role_id=role_id))
    
    await db.commit()
    
    # Reload with relationships
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.roles).selectinload(Role.permissions))
        .where(Group.id == db_group.id)
    )
    return result.scalar_one()

@router.get("/", response_model=list[GroupResponse])
async def read_groups(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.roles).selectinload(Role.permissions))
        .offset(skip).limit(limit)
    )
    groups = result.scalars().all()
    return groups

@router.patch("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    group_in: GroupUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    from app.models import GroupRole
    from sqlalchemy import delete
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    update_data = group_in.model_dump(exclude_unset=True)
    role_ids = update_data.pop("role_ids", None)
    
    for field, value in update_data.items():
        setattr(group, field, value)
        
    if role_ids is not None:
        await db.execute(delete(GroupRole).where(GroupRole.group_id == group.id))
        for rid in role_ids:
            db.add(GroupRole(group_id=group.id, role_id=rid))
    
    await db.commit()
    
    # Reload with relationships
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.roles).selectinload(Role.permissions))
        .where(Group.id == group.id)
    )
    return result.scalar_one()

@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    await db.delete(group)
    await db.commit()
    return None
