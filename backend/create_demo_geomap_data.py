import asyncio
import os
import random
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:password@localhost:5432/bi_platform"

async def main():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    states = [
        "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
        "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli",
        "Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
        "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Lakshadweep",
        "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
        "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim",
        "Tamil Nadu", "Telangana", "Tripura", "Uttarakhand", "Uttar Pradesh", "West Bengal"
    ]
    
    districts_mh = [
        "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana",
        "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna",
        "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded",
        "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad",
        "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha",
        "Washim", "Yavatmal"
    ]

    async with async_session() as session:
        # Create and populate India demo table
        await session.execute(text("DROP TABLE IF EXISTS demo_geomap_india;"))
        await session.execute(text("""
            CREATE TABLE demo_geomap_india (
                id SERIAL PRIMARY KEY,
                state_name VARCHAR(100),
                population INT,
                total_sales DECIMAL(15, 2),
                active_users INT,
                satisfaction_score DECIMAL(3, 2)
            );
        """))
        
        for state in states:
            pop = random.randint(1000000, 200000000)
            sales = round(random.uniform(10000, 5000000), 2)
            users = random.randint(5000, 500000)
            score = round(random.uniform(3.5, 5.0), 2)
            await session.execute(
                text("INSERT INTO demo_geomap_india (state_name, population, total_sales, active_users, satisfaction_score) VALUES (:state, :pop, :sales, :users, :score)"),
                {"state": state, "pop": pop, "sales": sales, "users": users, "score": score}
            )
            
        # Create and populate Maharashtra demo table
        await session.execute(text("DROP TABLE IF EXISTS demo_geomap_maharashtra;"))
        await session.execute(text("""
            CREATE TABLE demo_geomap_maharashtra (
                id SERIAL PRIMARY KEY,
                district VARCHAR(100),
                population INT,
                total_sales DECIMAL(15, 2),
                active_users INT,
                satisfaction_score DECIMAL(3, 2)
            );
        """))
        
        for dist in districts_mh:
            pop = random.randint(500000, 15000000)
            sales = round(random.uniform(5000, 1000000), 2)
            users = random.randint(1000, 100000)
            score = round(random.uniform(3.0, 5.0), 2)
            await session.execute(
                text("INSERT INTO demo_geomap_maharashtra (district, population, total_sales, active_users, satisfaction_score) VALUES (:dist, :pop, :sales, :users, :score)"),
                {"dist": dist, "pop": pop, "sales": sales, "users": users, "score": score}
            )

        await session.commit()
    print("Successfully created and populated tables 'demo_geomap_india' and 'demo_geomap_maharashtra'!")

if __name__ == "__main__":
    asyncio.run(main())
