import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import Datasource, Dataset, DatasetColumn, DatasetMetric
from app.config import settings
from sqlalchemy import select

async def add_test_dataset():
    engine = create_async_engine(settings.DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # Get datasource
        result = await session.execute(select(Datasource).where(Datasource.name == "BI Platform Database"))
        ds = result.scalar_one_or_none()
        if not ds:
            print("Datasource not found")
            return

        # Check if dataset exists
        result = await session.execute(select(Dataset).where(Dataset.name == "System Users"))
        if result.scalar_one_or_none():
            print("Dataset already exists")
            return

        dataset = Dataset(
            name="System Users",
            datasource_id=ds.id,
            table_name="users",
            schema_metadata={
                "columns": [
                    {"name": "full_name", "type": "string"},
                    {"name": "email", "type": "string"},
                    {"name": "is_active", "type": "boolean"},
                    {"name": "created_at", "type": "datetime"}
                ]
            }
        )
        session.add(dataset)
        await session.flush()

        # Add Columns
        cols = [
            DatasetColumn(dataset_id=dataset.id, column_name="full_name", friendly_name="User Name", data_type="string"),
            DatasetColumn(dataset_id=dataset.id, column_name="email", friendly_name="Email Address", data_type="string"),
            DatasetColumn(dataset_id=dataset.id, column_name="is_active", friendly_name="Is Active", data_type="boolean"),
            DatasetColumn(dataset_id=dataset.id, column_name="created_at", friendly_name="Signup Date", data_type="datetime"),
        ]
        session.add_all(cols)

        # Add Metrics
        metrics = [
            DatasetMetric(dataset_id=dataset.id, name="user_count", friendly_name="Total Users", expression="COUNT(*)"),
            DatasetMetric(dataset_id=dataset.id, name="active_users", friendly_name="Active Users", expression="SUM(CASE WHEN is_active THEN 1 ELSE 0 END)"),
        ]
        session.add_all(metrics)

        await session.commit()
        print("Successfully added 'System Users' dataset with columns and metrics.")

if __name__ == "__main__":
    asyncio.run(add_test_dataset())
