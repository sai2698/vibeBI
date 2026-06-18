import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models import User, Dashboard
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.mailer.screenshot import take_dashboard_screenshot

async def main():
    print("Connecting to database...")
    async with AsyncSessionLocal() as db:
        # Get first user with group relationships loaded
        from app.models import Group, Role
        user_res = await db.execute(
            select(User)
            .options(selectinload(User.groups).selectinload(Group.roles).selectinload(Role.permissions))
            .limit(1)
        )
        user = user_res.scalars().first()
        if not user:
            print("No users found in database!")
            return
            
        print(f"Using user: {user.email} (ID: {user.id})")
        
        # Get first dashboard
        dash_res = await db.execute(select(Dashboard).limit(1))
        dashboard = dash_res.scalars().first()
        if not dashboard:
            print("No dashboards found in database!")
            return
            
        print(f"Using dashboard: {dashboard.title} (ID: {dashboard.id})")
        
        print("Taking screenshot...")
        try:
            screenshot_bytes = await take_dashboard_screenshot(dashboard.id, user)
            
            output_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'dashboard_test.png'))
            with open(output_path, 'wb') as f:
                f.write(screenshot_bytes)
            print(f"Screenshot successfully saved to: {output_path}")
            
        except Exception as e:
            print(f"Failed to take screenshot: {e}")

if __name__ == "__main__":
    asyncio.run(main())
