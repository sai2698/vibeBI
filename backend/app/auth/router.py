from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import User
from app.schemas import Token, UserResponse
from app.auth.security import verify_password, create_access_token
from app.auth.dependencies import get_current_active_user
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    # 1. Check local authentication
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    local_auth_success = False
    if user and user.auth_source == "local":
        if verify_password(form_data.password, user.hashed_password):
            local_auth_success = True

    if not local_auth_success:
        # 2. Check LDAP authentication if enabled
        from app.models import LDAPConfig
        from app.auth.ldap_utils import authenticate_ldap
        
        ldap_config_result = await db.execute(select(LDAPConfig).limit(1))
        ldap_config = ldap_config_result.scalar_one_or_none()
        
        if ldap_config and ldap_config.is_enabled:
            from starlette.concurrency import run_in_threadpool
            ldap_user_info = await run_in_threadpool(authenticate_ldap, ldap_config, form_data.username, form_data.password)
            if ldap_user_info:
                # Check if user already exists by their resolved LDAP email
                ldap_email = ldap_user_info["email"]
                result = await db.execute(select(User).where(User.email == ldap_email))
                user = result.scalar_one_or_none()

                # LDAP Auth Success - Auto-create or update local user
                if not user:
                    user = User(
                        email=ldap_email,
                        full_name=ldap_user_info["full_name"],
                        hashed_password="LDAP_EXTERNAL_AUTH", # Not used
                        auth_source="ldap",
                        is_active=True
                    )
                    db.add(user)
                    await db.commit()
                    await db.refresh(user)
                else:
                    # Sync existing user if they moved to LDAP
                    user.auth_source = "ldap"
                    user.full_name = ldap_user_info["full_name"]
                    await db.commit()
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password (LDAP)",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    from app.models import UserGroup, GroupRole, Role, RolePermission, Permission
    
    # Fetch roles
    roles_query = (
        select(Role.name)
        .join(GroupRole, GroupRole.role_id == Role.id)
        .join(UserGroup, UserGroup.group_id == GroupRole.group_id)
        .where(UserGroup.user_id == current_user.id)
    )
    roles_result = await db.execute(roles_query)
    roles = roles_result.scalars().all()
    
    # Fetch permissions
    permissions_query = (
        select(Permission.name)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(GroupRole, GroupRole.role_id == RolePermission.role_id)
        .join(UserGroup, UserGroup.group_id == GroupRole.group_id)
        .where(UserGroup.user_id == current_user.id)
    )
    permissions_result = await db.execute(permissions_query)
    permissions = permissions_result.scalars().all()
    
    user_data = UserResponse.model_validate(current_user)
    user_data.roles = list(roles)
    user_data.permissions = list(set(permissions)) # De-duplicate
    return user_data
