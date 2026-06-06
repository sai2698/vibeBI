import asyncio
from app.database import AsyncSessionLocal, engine
from app.models import AIBot
from sqlalchemy import select

async def seed_system_bots():
    async with AsyncSessionLocal() as db:
        # Check if system bots already exist
        result = await db.execute(select(AIBot).where(AIBot.is_system == True))
        if result.scalars().first():
            print("System bots already seeded")
            return

        system_bots = [
            {
                "name": "SQL Query Assistant",
                "bot_id": "query",
                "description": "Generate complex, optimized SQL queries from your natural language requests.",
                "avatar_config": {"icon": "Terminal", "color": "bg-indigo-600", "tagline": "Text-to-SQL Expert"},
                "is_system": True
            },
            {
                "name": "Business Insight Bot",
                "bot_id": "insight",
                "description": "Deep-dive analysis to uncover hidden trends, correlations, and growth drivers.",
                "avatar_config": {"icon": "Brain", "color": "bg-emerald-600", "tagline": "Data Discovery"},
                "is_system": True
            },
            {
                "name": "Anomaly Detector",
                "bot_id": "anomaly",
                "description": "Instant detection of spikes, drops, and outliers across your global datasources.",
                "avatar_config": {"icon": "Zap", "color": "bg-rose-600", "tagline": "Proactive Monitoring"},
                "is_system": True
            },
            {
                "name": "Predictive Analyst",
                "bot_id": "predict",
                "description": "Leverage machine learning to project future performance and identify risks.",
                "avatar_config": {"icon": "TrendingUp", "color": "bg-amber-600", "tagline": "Future Forecasting"},
                "is_system": True
            }
        ]

        for bot_data in system_bots:
            bot = AIBot(**bot_data)
            db.add(bot)
        
        await db.commit()
        print("System bots seeded successfully")

if __name__ == "__main__":
    asyncio.run(seed_system_bots())
