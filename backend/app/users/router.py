from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import User, Group, Role
from app.schemas import UserCreate, UserResponse, UserUpdate
from app.auth.security import get_password_hash
from app.auth.dependencies import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    from app.models import UserGroup
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        is_active=user_in.is_active
    )
    db.add(db_user)
    await db.flush()
    
    if user_in.group_ids:
        for group_id in user_in.group_ids:
            db.add(UserGroup(user_id=db_user.id, group_id=group_id))
    
    await db.commit()
    
    # Reload with relationships for response
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User)
        .options(selectinload(User.groups).selectinload(Group.roles).selectinload(Role.permissions))
        .where(User.id == db_user.id)
    )
    return result.scalar_one()

@router.get("/", response_model=list[UserResponse])
async def read_users(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User)
        .options(selectinload(User.groups).selectinload(Group.roles).selectinload(Role.permissions))
        .offset(skip).limit(limit)
    )
    users = result.scalars().all()
    return users

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    from app.models import UserGroup
    from sqlalchemy import delete
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_in.model_dump(exclude_unset=True)
    group_ids = update_data.pop("group_ids", None)
    
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    if group_ids is not None:
        # Delete old links
        await db.execute(delete(UserGroup).where(UserGroup.user_id == user.id))
        # Add new links
        for gid in group_ids:
            db.add(UserGroup(user_id=user.id, group_id=gid))
    
    await db.commit()
    
    # Reload with relationships
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User)
        .options(selectinload(User.groups).selectinload(Group.roles).selectinload(Role.permissions))
        .where(User.id == user.id)
    )
    return result.scalar_one()

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
    await db.delete(user)
    await db.commit()
    return None
