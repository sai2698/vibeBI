from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models import User, RowLevelSecurity, Role, Dataset
from app.schemas import RLSCreate, RLSUpdate, RLSResponse
from app.auth.dependencies import get_current_admin_user

router = APIRouter(prefix="/api/rls", tags=["rls"])

@router.get("/", response_model=List[RLSResponse])
async def list_rls_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(RowLevelSecurity).options(selectinload(RowLevelSecurity.roles), selectinload(RowLevelSecurity.datasets)))
    rules = result.scalars().all()
    # Pydantic will serialize relationships, but we must populate role_ids explicitly for the schema mapping
    for rule in rules:
        rule.role_ids = [r.id for r in rule.roles]
        rule.dataset_ids = [d.id for d in rule.datasets]
    return rules

@router.post("/", response_model=RLSResponse, status_code=status.HTTP_201_CREATED)
async def create_rls_rule(
    rule_in: RLSCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    db_rule = RowLevelSecurity(
        name=rule_in.name,
        description=rule_in.description,
        filter_type=rule_in.filter_type,
        clause=rule_in.clause,
    )
    
    if rule_in.role_ids:
        result = await db.execute(select(Role).where(Role.id.in_(rule_in.role_ids)))
        db_rule.roles = list(result.scalars().all())

    if rule_in.dataset_ids:
        ds_result = await db.execute(select(Dataset).where(Dataset.id.in_(rule_in.dataset_ids)))
        db_rule.datasets = list(ds_result.scalars().all())

    db.add(db_rule)
    await db.commit()
    await db.refresh(db_rule)
    
    result = await db.execute(select(RowLevelSecurity).options(selectinload(RowLevelSecurity.roles), selectinload(RowLevelSecurity.datasets)).where(RowLevelSecurity.id == db_rule.id))
    db_rule = result.scalar_one()
    db_rule.role_ids = [r.id for r in db_rule.roles]
    db_rule.dataset_ids = [d.id for d in db_rule.datasets]
    return db_rule

@router.put("/{rule_id}", response_model=RLSResponse)
async def update_rls_rule(
    rule_id: int,
    rule_in: RLSUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(RowLevelSecurity).options(selectinload(RowLevelSecurity.roles), selectinload(RowLevelSecurity.datasets)).where(RowLevelSecurity.id == rule_id))
    db_rule = result.scalar_one_or_none()
    
    if not db_rule:
        raise HTTPException(status_code=404, detail="RLS rule not found")
        
    update_data = rule_in.dict(exclude_unset=True)
    role_ids = update_data.pop("role_ids", None)
    dataset_ids = update_data.pop("dataset_ids", None)
    
    for key, value in update_data.items():
        setattr(db_rule, key, value)
        
    if role_ids is not None:
        if role_ids:
            roles_result = await db.execute(select(Role).where(Role.id.in_(role_ids)))
            db_rule.roles = list(roles_result.scalars().all())
        else:
            db_rule.roles = []
            
    if dataset_ids is not None:
        if dataset_ids:
            ds_result = await db.execute(select(Dataset).where(Dataset.id.in_(dataset_ids)))
            db_rule.datasets = list(ds_result.scalars().all())
        else:
            db_rule.datasets = []
            
    await db.commit()
    
    # Refresh to get roles properly for serialization
    result = await db.execute(select(RowLevelSecurity).options(selectinload(RowLevelSecurity.roles), selectinload(RowLevelSecurity.datasets)).where(RowLevelSecurity.id == rule_id))
    db_rule = result.scalar_one()
    db_rule.role_ids = [r.id for r in db_rule.roles]
    db_rule.dataset_ids = [d.id for d in db_rule.datasets]
    return db_rule

@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rls_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(RowLevelSecurity).where(RowLevelSecurity.id == rule_id))
    db_rule = result.scalar_one_or_none()
    
    if not db_rule:
        raise HTTPException(status_code=404, detail="RLS rule not found")
        
    await db.delete(db_rule)
    await db.commit()
    return None
