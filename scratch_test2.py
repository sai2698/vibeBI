import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # Get token
        res = await client.post("http://localhost:8000/api/auth/token", data={"username": "admin@enterprise.com", "password": "admin123"})
        if res.status_code != 200:
            print("Login failed", res.text)
            return
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get bot
        res = await client.get("http://localhost:8000/api/ai/bots", headers=headers)
        bots = res.json()
        if not bots:
            print("No bots found")
            return
        bot = bots[0]
        bot_id = bot["bot_id"]
        
        # Create session
        res = await client.post("http://localhost:8000/api/ai/sessions", json={"title": "Test", "bot_id": bot_id}, headers=headers)
        session_id = res.json()["id"]
        print(f"Created session {session_id}")
        
        # Generate title
        r = await client.post(f"http://localhost:8000/api/ai/sessions/{session_id}/generate-title", json={"message": "hello"}, headers=headers)
        print("Title status:", r.status_code)
        print("Title res:", r.text)
        
        # Verify title in DB
        res = await client.get(f"http://localhost:8000/api/ai/sessions/{session_id}", headers=headers)
        print("Final session data:", res.json())

asyncio.run(main())
