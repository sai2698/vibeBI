from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import LineOfBusiness, User
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
    db.add(db_lob)
    await db.commit()
    await db.refresh(db_lob)
    return db_lob

@router.get("/", response_model=list[LineOfBusinessResponse])
async def read_lobs(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(LineOfBusiness).offset(skip).limit(limit))
    lobs = result.scalars().all()
    return lobs

@router.patch("/{lob_id}", response_model=LineOfBusinessResponse)
async def update_lob(
    lob_id: int,
    lob_in: LineOfBusinessUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(LineOfBusiness).where(LineOfBusiness.id == lob_id))
    lob = result.scalar_one_or_none()
    if not lob:
        raise HTTPException(status_code=404, detail="LOB not found")
    
    update_data = lob_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lob, field, value)
    
    await db.commit()
    await db.refresh(lob)
    return lob

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
