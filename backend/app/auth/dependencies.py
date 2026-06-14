from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.config import settings
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    from sqlalchemy.orm import selectinload
    from app.models import Group, Role
    result = await db.execute(
        select(User)
        .options(selectinload(User.groups).selectinload(Group.roles).selectinload(Role.permissions))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    # Check if user belongs to a group with 'Admin' role
    from app.models import UserGroup, GroupRole, Role
    
    query = (
        select(User)
        .join(UserGroup, UserGroup.user_id == User.id)
        .join(GroupRole, GroupRole.group_id == UserGroup.group_id)
        .join(Role, Role.id == GroupRole.role_id)
        .where(User.id == current_user.id)
        .where(Role.name == "Admin")
    )
    
    result = await db.execute(query)
    admin_user = result.scalars().first()
    
    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return admin_user

def has_permission(permission_name: str):
    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        from app.models import UserGroup, GroupRole, RolePermission, Permission
        
        # Check if user has 'admin:all' or the specific permission
        query = (
            select(Permission.name)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .join(GroupRole, GroupRole.role_id == RolePermission.role_id)
            .join(UserGroup, UserGroup.group_id == GroupRole.group_id)
            .where(UserGroup.user_id == current_user.id)
            .where((Permission.name == permission_name) | (Permission.name == "admin:all"))
        )
        
        result = await db.execute(query)
        if not result.first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {permission_name}"
            )
        return current_user
    return permission_checker
