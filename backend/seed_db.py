import asyncio
from uuid import uuid4
from datetime import datetime
from app.database import engine, Base, AsyncSessionLocal as SessionLocal
from app.models import User, Role, Group, Permission, RolePermission, GroupRole, UserGroup
from app.auth.security import get_password_hash
from sqlalchemy.future import select

async def seed():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        # Create Superuser if not exists
        result = await session.execute(select(User).where(User.email == "admin@biplatform.com"))
        superuser = result.scalar_one_or_none()
        if not superuser:
            superuser = User(
                id=uuid4(),
                email="admin@biplatform.com",
                hashed_password=get_password_hash("admin123"),
                full_name="System Administrator",
                is_active=True,
                created_at=datetime.utcnow()
            )
            session.add(superuser)
            await session.commit()
            await session.refresh(superuser)

        # Sprint 10: Granular Permissions
        default_permissions = [
            ("menu:dashboards", "Access to Dashboards"),
            ("menu:sqllab", "Access to SQL Lab"),
            ("menu:chart_builder", "Access to Chart Builder"),
            ("menu:data_management", "Access to Datasources and Datasets"),
            ("admin:all", "Full system access"),
            ("datasource:read", "Read access to datasources"),
            ("datasource:write", "Write access to datasources"),
        ]
        
        perm_map = {}
        for p_name, p_desc in default_permissions:
            result = await session.execute(select(Permission).where(Permission.name == p_name))
            perm = result.scalar_one_or_none()
            if not perm:
                perm = Permission(name=p_name, description=p_desc)
                session.add(perm)
                await session.flush()
                await session.refresh(perm)
            perm_map[p_name] = perm.id

        # Create Roles
        roles_to_create = [
            ("Admin", "Full Administrator", ["admin:all", "menu:dashboards", "menu:sqllab", "menu:chart_builder", "menu:data_management"]),
            ("Alpha", "Regular Power User", ["menu:dashboards", "menu:sqllab", "menu:chart_builder", "menu:data_management"]),
            ("Gamma", "Read-only User", ["menu:dashboards"]),
        ]
        
        for r_name, r_desc, r_perms in roles_to_create:
            result = await session.execute(select(Role).where(Role.name == r_name))
            role = result.scalar_one_or_none()
            if not role:
                role = Role(name=r_name, description=r_desc)
                session.add(role)
                await session.flush()
                await session.refresh(role)
            
            # Link permissions to role
            for p_name in r_perms:
                p_id = perm_map[p_name]
                link_result = await session.execute(
                    select(RolePermission).where(RolePermission.role_id == role.id, RolePermission.permission_id == p_id)
                )
                if not link_result.scalar_one_or_none():
                    session.add(RolePermission(role_id=role.id, permission_id=p_id))

        # Ensure Admin Group has Admin Role
        result = await session.execute(select(Group).where(Group.name == "Administrators"))
        admin_group = result.scalar_one_or_none()
        if not admin_group:
            admin_group = Group(name="Administrators", description="Group for admins")
            session.add(admin_group)
            await session.flush()
            await session.refresh(admin_group)
        
        result = await session.execute(select(Role).where(Role.name == "Admin"))
        admin_role = result.scalar_one_or_none()
        
        result = await session.execute(
            select(GroupRole).where(GroupRole.group_id == admin_group.id, GroupRole.role_id == admin_role.id)
        )
        if not result.scalar_one_or_none():
            session.add(GroupRole(group_id=admin_group.id, role_id=admin_role.id))
        
        # Link admin user to Administrators group
        result = await session.execute(
            select(UserGroup).where(UserGroup.user_id == superuser.id, UserGroup.group_id == admin_group.id)
        )
        if not result.scalar_one_or_none():
            session.add(UserGroup(user_id=superuser.id, group_id=admin_group.id))
        
        await session.commit()
        print("Granular RBAC seed complete!")
        print("Database seed check complete!")
        print("Admin user: admin@biplatform.com / admin123")

if __name__ == "__main__":
    asyncio.run(seed())
