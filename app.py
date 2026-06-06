# # from fastapi import FastAPI, Request, HTTPException
# # from fastapi.responses import StreamingResponse, JSONResponse
# # import httpx
# # import os

# # app = FastAPI()

# # # config
# # LLM_API_URL = os.getenv("https://openrouter.ai/api/v1")
# # LLM_API_KEY = os.getenv("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")
# # MODEL_NAME = os.getenv("baidu/cobuddy:free")



# # @app.post("/chat")
# # async def chat(request: Request):
# #     """
# #     Proxy chat completion endpoint with:
# #     - streaming passthrough
# #     - tool calling support
# #     - thinking/reasoning passthrough
# #     """

# #     body = await request.json()

# #     # force your model if not passed
# #     body["model"] = body.get("model", MODEL_NAME)

# #     headers = {
# #         "Authorization": f"Bearer {LLM_API_KEY}",
# #         "Content-Type": "application/json",
# #         "Accept": "text/event-stream",
# #     }

# #     async def stream():
# #         async with httpx.AsyncClient(timeout=None, verify=False) as client:
# #             async with client.stream(
# #                 "POST",
# #                 LLM_API_URL,
# #                 headers=headers,
# #                 json=body,
# #             ) as response:

# #                 if response.status_code >= 400:
# #                     error = await response.aread()
# #                     raise HTTPException(
# #                         status_code=response.status_code,
# #                         detail=error.decode()
# #                     )

# #                 async for chunk in response.aiter_raw():
# #                     yield chunk

# #     return StreamingResponse(
# #         stream(),
# #         media_type="text/event-stream",
# #         headers={
# #             "Cache-Control": "no-cache",
# #             "Connection": "keep-alive",
# #         },
# #     )




# from fastapi import FastAPI, Request
# from fastapi.responses import StreamingResponse
# import httpx
# import json
# import os

# app = FastAPI()

# LLM_API_URL = os.getenv("https://openrouter.ai/api/v1")
# LLM_API_KEY = os.getenv("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")
# MODEL_NAME = os.getenv("baidu/cobuddy:free")



# # -------------------------
# # tool implementation
# # -------------------------
# async def web_search(query: str):
#     """
#     simple web search in python
#     """
#     async with httpx.AsyncClient(timeout=20) as client:
#         r = await client.get(
#             "https://duckduckgo.com/html/",
#             params={"q": query},
#         )

#     return {
#         "query": query,
#         "result": r.text[:5000]
#     }


# TOOLS = [
#     {
#         "type": "function",
#         "function": {
#             "name": "web_search",
#             "description": "Search the web",
#             "parameters": {
#                 "type": "object",
#                 "properties": {
#                     "query": {
#                         "type": "string"
#                     }
#                 },
#                 "required": ["query"]
#             }
#         }
#     }
# ]


# def llm_headers():
#     return {
#         "Authorization": f"Bearer {LLM_API_KEY}",
#         "Content-Type": "application/json",
#     }


# # -------------------------
# # non-stream call for tool detection
# # -------------------------
# async def call_llm(messages):

#     payload = {
#         "model": MODEL_NAME,
#         "messages": messages,
#         "tools": TOOLS,
#         "stream": False
#     }

#     async with httpx.AsyncClient(timeout=None, verify=False) as client:
#         r = await client.post(
#             LLM_API_URL,
#             headers=llm_headers(),
#             json=payload,
#         )

#     r.raise_for_status()
#     return r.json()


# # -------------------------
# # stream final answer raw
# # -------------------------
# async def stream_llm(messages):

#     payload = {
#         "model": MODEL_NAME,
#         "messages": messages,
#         "tools": TOOLS,
#         "stream": True
#     }

#     async with httpx.AsyncClient(timeout=None, verify=False) as client:

#         async with client.stream(
#             "POST",
#             LLM_API_URL,
#             headers=llm_headers(),
#             json=payload,
#         ) as r:

#             async for chunk in r.aiter_raw():
#                 yield chunk


# # -------------------------
# # chat endpoint
# # -------------------------
# @app.post("/chat")
# async def chat(request: Request):

#     body = await request.json()

#     messages = body["messages"]

#     # first call → detect tool usage
#     resp = await call_llm(messages)

#     assistant_message = resp["choices"][0]["message"]

#     tool_calls = assistant_message.get("tool_calls")

#     if tool_calls:

#         messages.append(assistant_message)

#         for tool in tool_calls:

#             fn = tool["function"]["name"]

#             args = json.loads(tool["function"]["arguments"])

#             if fn == "web_search":

#                 result = await web_search(
#                     args["query"]
#                 )

#                 messages.append(
#                     {
#                         "role": "tool",
#                         "tool_call_id": tool["id"],
#                         "name": fn,
#                         "content": json.dumps(result)
#                     }
#                 )

#     return StreamingResponse(
#         stream_llm(messages),
#         media_type="text/event-stream"
#     )





from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LLM_API_URL = os.getenv("LLM_API_URL", "https://openrouter.ai/api/v1/chat/completions")
LLM_API_KEY = os.getenv("LLM_API_KEY", "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")
MODEL_NAME  = os.getenv("MODEL_NAME",  "baidu/cobuddy:free")


def llm_headers() -> dict:
    return {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
        "X-Accel-Buffering": "no", # Prevents proxy buffering (Nginx)
    }


def clean_messages(raw: list[dict]) -> list[dict]:
    """Keep only role + content; drop any frontend-only fields."""
    out = []
    for m in raw:
        role = m.get("role")
        content = m.get("content") or ""
        if role in ("user", "assistant", "system"):
            out.append({"role": role, "content": content})
    return out


async def proxy_stream(messages: list[dict]):
    payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "stream": True,
    }

    # Use a generous pool timeout instead of None to prevent dead locks
    timeout = httpx.Timeout(60.0, connect=10.0)
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream(
            "POST",
            LLM_API_URL,
            headers=llm_headers(),
            json=payload,
        ) as r:
            # Handle non-200 errors from OpenRouter gracefully
            if r.status_code != 200:
                error_text = await r.aread()
                yield f"data: {{\"error\": \"OpenRouter API Error: {r.status_code}\", \"details\": \"{error_text.decode()}\"}}\n\n"
                return

            async for line in r.aiter_lines():
                # OpenRouter sends blank lines as keep-alives. 
                # If we add "\n\n" to a blank line, it creates empty, malformed SSE packets.
                if not line.strip():
                    yield "\n"
                    continue
                
                # Forward valid data lines instantly with standard SSE line breaks
                yield line + "\n"


@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    messages = clean_messages(body.get("messages", []))

    return StreamingResponse(
        proxy_stream(messages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform", # no-transform prevents compression proxies from buffering
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_NAME}
