from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_

from app.database import get_db
from app.models import ChartFolder, User, Chart
from app.schemas import ChartFolderCreate, ChartFolderUpdate, ChartFolderResponse
from app.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/api/chart-folders", tags=["chart_folders"])

@router.post("/", response_model=ChartFolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    folder_in: ChartFolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_folder = ChartFolder(
        name=folder_in.name,
        parent_id=folder_in.parent_id,
        lob_id=folder_in.lob_id,
        owner_id=current_user.id
    )
    db.add(db_folder)
    await db.commit()
    await db.refresh(db_folder)
    return db_folder

@router.get("/", response_model=List[ChartFolderResponse])
async def read_folders(
    lob_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(ChartFolder)
    if lob_id:
        query = query.where(ChartFolder.lob_id == lob_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.patch("/{folder_id}", response_model=ChartFolderResponse)
async def update_folder(
    folder_id: int,
    folder_in: ChartFolderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(ChartFolder).where(ChartFolder.id == folder_id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    update_data = folder_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(folder, field, value)

    await db.commit()
    await db.refresh(folder)
    return folder

@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(ChartFolder).where(ChartFolder.id == folder_id))
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    await db.delete(folder)
    await db.commit()
    return None
