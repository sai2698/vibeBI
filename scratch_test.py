import asyncio
import httpx
import uuid

async def main():
    async with httpx.AsyncClient() as client:
        # Assuming admin/admin
        res = await client.post("http://localhost:8000/api/auth/login", data={"username": "admin", "password": "password"})
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
        
        # Concurrent title generation and stream
        async def generate_title():
            r = await client.post(f"http://localhost:8000/api/ai/sessions/{session_id}/generate-title", json={"message": "hello"}, headers=headers)
            print("Title status:", r.status_code)
            
        async def stream_message():
            r = await client.post(f"http://localhost:8000/api/ai/sessions/{session_id}/messages/stream", json={"content": "hello"}, headers=headers)
            print("Stream status:", r.status_code)
            async for chunk in r.aiter_text():
                pass
            print("Stream finished")
            
        await asyncio.gather(generate_title(), stream_message())

asyncio.run(main())
