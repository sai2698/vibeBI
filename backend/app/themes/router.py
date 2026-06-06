from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import Theme, User
from app.schemas import ThemeCreate, ThemeResponse
from app.auth.dependencies import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/themes", tags=["themes"])

@router.get("/", response_model=list[ThemeResponse])
async def read_themes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(Theme))
    themes = result.scalars().all()
    return themes

@router.post("/", response_model=ThemeResponse, status_code=status.HTTP_201_CREATED)
async def create_theme(
    theme_in: ThemeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user) # Allow all active users or admins to create/upload themes
):
    # Check if a theme with the same name already exists
    result = await db.execute(select(Theme).where(Theme.name == theme_in.name))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Theme '{theme_in.name}' already registered")
        
    db_theme = Theme(
        name=theme_in.name,
        config=theme_in.config
    )
    db.add(db_theme)
    await db.commit()
    await db.refresh(db_theme)
    return db_theme

@router.delete("/{theme_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_theme(
    theme_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(Theme).where(Theme.id == theme_id))
    theme = result.scalar_one_or_none()
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
        
    await db.delete(theme)
    await db.commit()
    return None
