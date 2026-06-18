import asyncio
import os
import sys
import httpx

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import AsyncSessionLocal
from app.models import User, Dashboard, Chart
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
        
        chart_res = await db.execute(select(Chart).limit(1))
        chart = chart_res.scalars().first()
        chart_id = chart.id if chart else None
        
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # 1. Test Dashboard with Excel data attachment
    payload_dash = {
        "to": ["test_recipient@biplatform.com"],
        "subject": "Executive Dashboard Excel Report: {{date}}",
        "body": "Hi, please review the attached Dashboard screenshot and sheet-based Excel data.",
        "target_type": "dashboard",
        "target_id": dashboard_id,
        "include_snapshot": True,
        "attach_data_format": "xlsx"
    }
    
    # 2. Test Chart with CSV data attachment
    payload_chart = {
        "to": ["test_recipient@biplatform.com"],
        "subject": "Chart CSV Report: {{date}}",
        "body": "Hi, please review the attached Chart snapshot and CSV data.",
        "target_type": "chart",
        "target_id": chart_id,
        "include_snapshot": True,
        "attach_data_format": "csv"
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        if dashboard_id:
            print(f"Sending dashboard report campaign for dashboard ID {dashboard_id}...")
            try:
                response = await client.post("http://localhost:8000/api/mailer/send", json=payload_dash, headers=headers)
                print(f"Dashboard response status code: {response.status_code}")
                print(f"Dashboard response body: {response.text}")
            except Exception as e:
                print(f"Dashboard request failed: {e}")
                
        if chart_id:
            print(f"\nSending chart report campaign for chart ID {chart_id}...")
            try:
                response = await client.post("http://localhost:8000/api/mailer/send", json=payload_chart, headers=headers)
                print(f"Chart response status code: {response.status_code}")
                print(f"Chart response body: {response.text}")
            except Exception as e:
                print(f"Chart request failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
