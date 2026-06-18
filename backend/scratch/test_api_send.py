import asyncio
import os
import sys
import httpx

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models import User, Dashboard
from sqlalchemy.future import select
from app.auth.security import create_access_token

async def main():
    print("Generating authorization token...")
    async with AsyncSessionLocal() as db:
        user_res = await db.execute(select(User).limit(1))
        user = user_res.scalars().first()
        if not user:
            print("No users found!")
            return
        token = create_access_token(subject=str(user.id))
        
        dash_res = await db.execute(select(Dashboard).limit(1))
        dashboard = dash_res.scalars().first()
        dashboard_id = dashboard.id if dashboard else None
        
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    payload = {
        "to": ["test_recipient@biplatform.com"],
        "subject": "Executive Dashboard Snapshot: {{date}}",
        "body": "Hello,\n\nPlease find attached the visual preview of the dashboard.",
        "dashboard_id": dashboard_id,
        "include_snapshot": True
    }
    
    print(f"Sending request to POST http://localhost:8000/api/mailer/send for dashboard {dashboard_id}...")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post("http://localhost:8000/api/mailer/send", json=payload, headers=headers)
            print(f"Response status code: {response.status_code}")
            print(f"Response body: {response.text}")
        except Exception as e:
            print(f"HTTP Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
