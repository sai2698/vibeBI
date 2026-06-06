from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
import uuid

from ..database import get_db
from ..models import DataMart, DataMartRole, DataMartDataset, Dataset, DatasetJoin, User, Group
from ..schemas import DataMartCreate, DataMartUpdate, DataMartResponse
from ..auth.dependencies import get_current_user

router = APIRouter()

@router.get("/", response_model=List[DataMartResponse])
async def list_datamarts(lob_id: int | None = None, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(User).options(selectinload(User.groups).selectinload(Group.roles)).where(User.id == current_user.id)
    result = await db.execute(query)
    user_with_groups = result.scalars().first()
    user_roles = []
    if user_with_groups and hasattr(user_with_groups, 'groups'):
        for g in user_with_groups.groups:
            for r in g.roles:
                user_roles.append(r.id)
    
    # User can see datamarts if they own it or if it's assigned to a role they have
    query = select(DataMart).options(
        selectinload(DataMart.roles),
        selectinload(DataMart.datasets).selectinload(Dataset.columns),
        selectinload(DataMart.datasets).selectinload(Dataset.metrics),
        selectinload(DataMart.datasets).selectinload(Dataset.calculated_columns)
    )
    
    if lob_id is not None:
        query = query.where(DataMart.lob_id == lob_id)
    
    result = await db.execute(query)
    datamarts = result.scalars().all()
    
    accessible = []
    for dm in datamarts:
        if dm.owner_id == current_user.id:
            accessible.append(dm)
            continue
        dm_roles = [r.id for r in dm.roles]
        if any(r in user_roles for r in dm_roles):
            accessible.append(dm)
            continue
    
    resp = []
    for dm in accessible:
        resp.append({
            "id": dm.id,
            "name": dm.name,
            "description": dm.description,
            "icon": dm.icon,
            "color": dm.color,
            "owner_id": dm.owner_id,
            "created_at": dm.created_at,
            "updated_at": dm.updated_at,
            "role_ids": [r.id for r in dm.roles],
            "datasets": dm.datasets,
            "lob_id": dm.lob_id
        })
    return resp

@router.get("/{datamart_id}/joins")
async def get_datamart_joins(
    datamart_id: int, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(DataMart)
        .options(selectinload(DataMart.datasets))
        .where(DataMart.id == datamart_id)
    )
    dm = result.scalar_one_or_none()
    if not dm:
        raise HTTPException(status_code=404, detail="Data Mart not found")
        
    ds_ids = [d.id for d in dm.datasets]
    if not ds_ids:
        return []
        
    from sqlalchemy import or_
    joins_res = await db.execute(
        select(DatasetJoin).where(
            or_(DatasetJoin.left_dataset_id.in_(ds_ids), DatasetJoin.right_dataset_id.in_(ds_ids))
        )
    )
    joins = joins_res.scalars().all()
    return [{"id": j.id, "left_dataset_id": j.left_dataset_id, "right_dataset_id": j.right_dataset_id, "join_type": j.join_type, "join_condition": j.join_condition} for j in joins]

@router.get("/{datamart_id}", response_model=DataMartResponse)
async def get_datamart(datamart_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(DataMart).options(
        selectinload(DataMart.roles),
        selectinload(DataMart.datasets).selectinload(Dataset.columns),
        selectinload(DataMart.datasets).selectinload(Dataset.metrics),
        selectinload(DataMart.datasets).selectinload(Dataset.calculated_columns)
    ).where(DataMart.id == datamart_id)
    
    result = await db.execute(query)
    dm = result.scalars().first()
    
    if not dm:
        raise HTTPException(status_code=404, detail="Data Mart not found")
        
    user_query = select(User).options(selectinload(User.groups).selectinload(Group.roles)).where(User.id == current_user.id)
    user_res = await db.execute(user_query)
    user_with_groups = user_res.scalars().first()
    user_roles = []
    if user_with_groups and hasattr(user_with_groups, 'groups'):
        for g in user_with_groups.groups:
            for r in g.roles:
                user_roles.append(r.id)
    
    dm_roles = [r.id for r in dm.roles]
    if dm.owner_id != current_user.id and not any(r in user_roles for r in dm_roles):
        raise HTTPException(status_code=403, detail="Not authorized to access this Data Mart")
        
    return {
        "id": dm.id,
        "name": dm.name,
        "description": dm.description,
        "icon": dm.icon,
        "color": dm.color,
        "owner_id": dm.owner_id,
        "created_at": dm.created_at,
        "updated_at": dm.updated_at,
        "role_ids": dm_roles,
        "datasets": dm.datasets,
        "lob_id": dm.lob_id
    }

@router.post("/", response_model=DataMartResponse)
async def create_datamart(mart: DataMartCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_dm = DataMart(
        name=mart.name,
        description=mart.description,
        icon=mart.icon,
        color=mart.color,
        lob_id=mart.lob_id,
        owner_id=current_user.id
    )
    db.add(new_dm)
    await db.commit()
    await db.refresh(new_dm)
    
    if mart.role_ids:
        for r_id in mart.role_ids:
            db.add(DataMartRole(datamart_id=new_dm.id, role_id=r_id))
    if mart.dataset_ids:
        for d_id in mart.dataset_ids:
            db.add(DataMartDataset(datamart_id=new_dm.id, dataset_id=d_id))
            
    if mart.role_ids or mart.dataset_ids:
        await db.commit()
        
    query = select(DataMart).options(
        selectinload(DataMart.roles),
        selectinload(DataMart.datasets).selectinload(Dataset.columns),
        selectinload(DataMart.datasets).selectinload(Dataset.metrics),
        selectinload(DataMart.datasets).selectinload(Dataset.calculated_columns)
    ).where(DataMart.id == new_dm.id)
    result = await db.execute(query)
    dm = result.scalars().first()
    
    return {
        "id": dm.id,
        "name": dm.name,
        "description": dm.description,
        "icon": dm.icon,
        "color": dm.color,
        "owner_id": dm.owner_id,
        "created_at": dm.created_at,
        "updated_at": dm.updated_at,
        "role_ids": [r.id for r in dm.roles],
        "datasets": dm.datasets,
        "lob_id": dm.lob_id
    }

@router.patch("/{datamart_id}", response_model=DataMartResponse)
async def update_datamart(datamart_id: int, mart: DataMartUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(DataMart).options(
        selectinload(DataMart.roles),
        selectinload(DataMart.datasets).selectinload(Dataset.columns),
        selectinload(DataMart.datasets).selectinload(Dataset.metrics),
        selectinload(DataMart.datasets).selectinload(Dataset.calculated_columns)
    ).where(DataMart.id == datamart_id)
    result = await db.execute(query)
    dm = result.scalars().first()
    
    if not dm:
        raise HTTPException(status_code=404, detail="Data Mart not found")
        
    if mart.name is not None:
        dm.name = mart.name
    if mart.description is not None:
        dm.description = mart.description
    if mart.icon is not None:
        dm.icon = mart.icon
    if mart.color is not None:
        dm.color = mart.color
    if mart.lob_id is not None:
        dm.lob_id = mart.lob_id
        
    if mart.role_ids is not None:
        await db.execute(DataMartRole.__table__.delete().where(DataMartRole.datamart_id == datamart_id))
        for r_id in mart.role_ids:
            db.add(DataMartRole(datamart_id=datamart_id, role_id=r_id))
            
    if mart.dataset_ids is not None:
        await db.execute(DataMartDataset.__table__.delete().where(DataMartDataset.datamart_id == datamart_id))
        for d_id in mart.dataset_ids:
            db.add(DataMartDataset(datamart_id=datamart_id, dataset_id=d_id))
            
    await db.commit()
    
    result = await db.execute(query)
    dm = result.scalars().first()
    
    return {
        "id": dm.id,
        "name": dm.name,
        "description": dm.description,
        "icon": dm.icon,
        "color": dm.color,
        "owner_id": dm.owner_id,
        "created_at": dm.created_at,
        "updated_at": dm.updated_at,
        "role_ids": [r.id for r in dm.roles],
        "datasets": dm.datasets,
        "lob_id": dm.lob_id
    }

@router.delete("/{datamart_id}")
async def delete_datamart(datamart_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(DataMart).where(DataMart.id == datamart_id)
    result = await db.execute(query)
    dm = result.scalars().first()
    
    if not dm:
        raise HTTPException(status_code=404, detail="Data Mart not found")
        
    await db.delete(dm)
    await db.commit()
    return {"message": "Data Mart deleted"}
