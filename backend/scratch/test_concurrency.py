import asyncio
import httpx
import time

async def fetch_dashboard_list(client, url):
    start = time.time()
    response = await client.get(f"{url}/api/dashboards/")
    print(f"Dashboard List took: {time.time() - start:.2f}s (Status: {response.status_code})")
    return response.status_code

async def run_long_query(client, url):
    start = time.time()
    # This query will take some time depending on the DB, but even 2s is enough to test blocking
    # We use a simple select or a sleep if the DB supports it
    payload = {
        "datasource_id": 1,
        "query": "SELECT 1", # In a real test, use a query that takes 2-3 seconds
        "limit": 100
    }
    response = await client.post(f"{url}/api/sqllab/execute", json=payload)
    print(f"Long Query took: {time.time() - start:.2f}s (Status: {response.status_code})")
    return response.status_code

async def test_concurrency():
    url = "http://localhost:8000"
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Start a long query
        # 2. Immediately try to fetch dashboards
        # If the backend is blocking, the dashboard list will wait for the long query
        print("Starting concurrency test...")
        tasks = [
            run_long_query(client, url),
            fetch_dashboard_list(client, url),
            fetch_dashboard_list(client, url),
            fetch_dashboard_list(client, url)
        ]
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(test_concurrency())
