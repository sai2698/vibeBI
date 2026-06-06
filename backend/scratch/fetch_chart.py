import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import Chart

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Chart).where(Chart.id == 33))
        chart = result.scalar_one_or_none()
        if chart:
            print(f"Chart 33: dataset_id={chart.dataset_id}, type={chart.chart_type}")
            print(f"query_config: {chart.query_config}")
        else:
            print("Chart 33 not found")

if __name__ == "__main__":
    asyncio.run(main())
