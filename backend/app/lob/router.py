from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_

from app.database import get_db
from app.models import LineOfBusiness, User, Role, Group, LOBRole, LOBGroup, LOBMember
from app.schemas import LineOfBusinessCreate, LineOfBusinessResponse, LineOfBusinessUpdate
from app.auth.dependencies import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/lob", tags=["lob"])

@router.post("/", response_model=LineOfBusinessResponse, status_code=status.HTTP_201_CREATED)
async def create_lob(
    lob_in: LineOfBusinessCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    db_lob = LineOfBusiness(
        name=lob_in.name,
        description=lob_in.description,
        icon=lob_in.icon,
        color=lob_in.color,
        is_active=lob_in.is_active
    )
    
    if lob_in.role_ids:
        db_lob.roles = (await db.execute(select(Role).where(Role.id.in_(lob_in.role_ids)))).scalars().all()
    if lob_in.group_ids:
        db_lob.groups = (await db.execute(select(Group).where(Group.id.in_(lob_in.group_ids)))).scalars().all()
    if lob_in.user_ids:
        db_lob.users = (await db.execute(select(User).where(User.id.in_(lob_in.user_ids)))).scalars().all()
        
    db.add(db_lob)
    await db.commit()
    
    # Refresh to get IDs
    result = await db.execute(select(LineOfBusiness).options(
        selectinload(LineOfBusiness.roles),
        selectinload(LineOfBusiness.groups),
        selectinload(LineOfBusiness.users)
    ).where(LineOfBusiness.id == db_lob.id))
    
    return result.scalar_one()

@router.get("/", response_model=list[LineOfBusinessResponse])
async def read_lobs(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is admin
    is_admin = False
    if current_user.groups:
        for group in current_user.groups:
            if group.roles:
                for role in group.roles:
                    if role.name == "Admin":
                        is_admin = True
                        break
            if is_admin:
                break
                
    query = select(LineOfBusiness).options(
        selectinload(LineOfBusiness.roles),
        selectinload(LineOfBusiness.groups),
        selectinload(LineOfBusiness.users)
    ).offset(skip).limit(limit)
    
    if not is_admin:
        user_role_ids = []
        user_group_ids = []
        if current_user.groups:
            user_group_ids = [group.id for group in current_user.groups]
            for group in current_user.groups:
                if group.roles:
                    user_role_ids.extend([role.id for role in group.roles])
                    
        conditions = []
        if user_role_ids:
            conditions.append(LineOfBusiness.roles.any(Role.id.in_(user_role_ids)))
        if user_group_ids:
            conditions.append(LineOfBusiness.groups.any(Group.id.in_(user_group_ids)))
        conditions.append(LineOfBusiness.users.any(User.id == current_user.id))
        
        query = query.where(or_(*conditions))
        
    result = await db.execute(query)
    lobs = result.scalars().all()
    return lobs

@router.patch("/{lob_id}", response_model=LineOfBusinessResponse)
async def update_lob(
    lob_id: int,
    lob_in: LineOfBusinessUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(LineOfBusiness).options(
        selectinload(LineOfBusiness.roles),
        selectinload(LineOfBusiness.groups),
        selectinload(LineOfBusiness.users)
    ).where(LineOfBusiness.id == lob_id))
    
    lob = result.scalar_one_or_none()
    if not lob:
        raise HTTPException(status_code=404, detail="LOB not found")
    
    update_data = lob_in.model_dump(exclude_unset=True, exclude={"role_ids", "group_ids", "user_ids"})
    for field, value in update_data.items():
        setattr(lob, field, value)
        
    if lob_in.role_ids is not None:
        lob.roles = (await db.execute(select(Role).where(Role.id.in_(lob_in.role_ids)))).scalars().all()
    if lob_in.group_ids is not None:
        lob.groups = (await db.execute(select(Group).where(Group.id.in_(lob_in.group_ids)))).scalars().all()
    if lob_in.user_ids is not None:
        lob.users = (await db.execute(select(User).where(User.id.in_(lob_in.user_ids)))).scalars().all()
    
    await db.commit()
    
    result = await db.execute(select(LineOfBusiness).options(
        selectinload(LineOfBusiness.roles),
        selectinload(LineOfBusiness.groups),
        selectinload(LineOfBusiness.users)
    ).where(LineOfBusiness.id == lob_id))
    
    return result.scalar_one()

@router.delete("/{lob_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lob(
    lob_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from sqlalchemy.exc import IntegrityError
    
    result = await db.execute(select(LineOfBusiness).where(LineOfBusiness.id == lob_id))
    lob = result.scalar_one_or_none()
    if not lob:
        raise HTTPException(status_code=404, detail="LOB not found")
        
    try:
        await db.delete(lob)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete Line of Business because it is referenced by other resources (e.g., dashboards, datasets, or charts).")
    
    return None
