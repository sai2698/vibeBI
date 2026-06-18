import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import List
from app.database import get_db
from app.schemas import (
    NLToSQLRequest, NLToSQLResponse, AISummaryRequest, AISummaryResponse,
    AIChatSessionSchema, AIChatSessionCreate, AIChatMessageCreate, AIChatMessageSchema,
    AIBotSchema, AIBotCreate, AIBotUpdate
)
from app.auth.dependencies import get_current_active_user
from app.models import User, AIChatSession, AIChatMessage, AIBot

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.get("/bots", response_model=List[AIBotSchema])
async def list_ai_bots(
    lob_id: int | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AIBot).where((AIBot.owner_id == current_user.id) | (AIBot.is_system == True))
    if lob_id is not None:
        query = query.where(AIBot.lob_id == lob_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/bots", response_model=AIBotSchema)
async def create_ai_bot(
    request: AIBotCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    bot = AIBot(
        name=request.name,
        description=request.description,
        bot_id=request.bot_id,
        avatar_config=request.avatar_config,
        llm_config=request.llm_config,
        knowledge_config=request.knowledge_config,
        owner_id=current_user.id,
        is_system=False,
        lob_id=request.lob_id
    )
    db.add(bot)
    await db.commit()
    await db.refresh(bot)
    return bot

@router.patch("/bots/{bot_id_uuid}", response_model=AIBotSchema)
async def update_ai_bot(
    bot_id_uuid: str,
    request: AIBotUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AIBot).where(
            (AIBot.id == bot_id_uuid) & 
            ((AIBot.owner_id == current_user.id) | (AIBot.is_system == True) | (AIBot.owner_id == None))
        )
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or access denied")
    
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(bot, key, value)
    
    await db.commit()
    await db.refresh(bot)
    return bot

@router.delete("/bots/{bot_id_uuid}")
async def delete_ai_bot(
    bot_id_uuid: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AIBot).where(AIBot.id == bot_id_uuid, AIBot.owner_id == current_user.id)
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or access denied")
    
    await db.delete(bot)
    await db.commit()
    return {"status": "deleted"}

@router.get("/sessions", response_model=List[AIChatSessionSchema])
async def list_chat_sessions(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AIChatSession)
        .where(AIChatSession.user_id == current_user.id)
        .options(selectinload(AIChatSession.messages))
        .order_by(AIChatSession.updated_at.desc())
    )
    return result.scalars().all()

@router.post("/sessions", response_model=AIChatSessionSchema)
async def create_chat_session(
    request: AIChatSessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    session = AIChatSession(
        user_id=current_user.id,
        title=request.title,
        bot_id=request.bot_id
    )
    db.add(session)
    await db.commit()
    
    # Eagerly load the session with messages to avoid lazy-loading error
    result = await db.execute(
        select(AIChatSession)
        .where(AIChatSession.id == session.id)
        .options(selectinload(AIChatSession.messages))
    )
    return result.scalar_one()

@router.get("/sessions/{session_id}", response_model=AIChatSessionSchema)
async def get_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AIChatSession)
        .where(AIChatSession.id == session_id, AIChatSession.user_id == current_user.id)
        .options(selectinload(AIChatSession.messages))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.post("/sessions/{session_id}/messages/stream")
async def stream_chat_message(
    session_id: str,
    request: AIChatMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    session_result = await db.execute(
        select(AIChatSession).where(AIChatSession.id == session_id, AIChatSession.user_id == current_user.id)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    bot_result = await db.execute(
        select(AIBot).where(AIBot.bot_id == session.bot_id)
    )
    bot = bot_result.scalar_one_or_none()
    if not bot:
        if session.bot_id == "dashboard":
            # Fallback for dashboard ad-hoc assistant
            bot = AIBot(
                bot_id="dashboard",
                llm_config={},
                tools_config={"enable_sql_tool": True},
                knowledge_config={}
            )
        else:
            raise HTTPException(status_code=404, detail="Bot configuration not found")

    user_msg = AIChatMessage(
        session_id=session_id,
        role="user",
        content=request.content
    )
    db.add(user_msg)
    
    dashboard_name = getattr(request, "dashboard_name", None)
            
    await db.commit()
    await db.refresh(user_msg)

    async def event_generator():
        yield f"data: {json.dumps({'event': 'user_message_created', 'id': user_msg.id})}\n\n"
        bot_llm_config = bot.llm_config or {}
        override_config = getattr(request, "llm_config_override", None) or {}
        
        # Merge overrides (dashboard settings) over default bot settings
        llm_config = {**bot_llm_config, **override_config}
        
        base_url = llm_config.get("base_url") or bot_llm_config.get("base_url")
        api_key = llm_config.get("api_key") or bot_llm_config.get("api_key")
        model_name = llm_config.get("model_name") or bot_llm_config.get("model_name", "gpt-4o")
        system_prompt = llm_config.get("system_prompt") or bot_llm_config.get("system_prompt", "You are a helpful assistant.")
        api_type = llm_config.get("api_type") or bot_llm_config.get("api_type", "chat_completions")
        custom_headers = llm_config.get("headers", {})
        if isinstance(custom_headers, str):
            try:
                custom_headers = json.loads(custom_headers)
            except Exception:
                custom_headers = {}
        if not isinstance(custom_headers, dict):
            custom_headers = {}
        
        ai_content = ""
        reasoning_content = ""
        tool_calls = []
        tool_results = []
        
        if not base_url:
            ai_content = "⚠️ **No LLM endpoint configured.** Please configure a valid LLM base URL, API key, and model name to enable AI responses."
            yield f"data: {json.dumps({'choices': [{'delta': {'content': ai_content}}]})}\n\n"
        else:
            try:
                import httpx
                from app.ai.tools import get_tool_instance
                from app.ai.tools.sql import get_dataset_schemas_summary
                from app.ai.utils import prepare_url, prepare_headers, prepare_tools, prepare_messages, parse_anthropic_stream_line
                
                # Setup tools
                enable_sql_tool = (bot.tools_config or {}).get("enable_sql_tool", False)
                dataset_ids = (bot.knowledge_config or {}).get("dataset_ids", [])
                
                # Dashboard context dataset isolation
                if getattr(request, "context_dataset_ids", None) is not None:
                    dataset_ids = list(request.context_dataset_ids)
                
                active_tools = {}
                tools_payload = []
                
                if enable_sql_tool and dataset_ids:
                    sql_tool = get_tool_instance("run_sql_query", dataset_ids=dataset_ids, user_email=current_user.email)
                    active_tools[sql_tool.name] = sql_tool
                    tools_payload.append(sql_tool.get_schema())
                    schema_summary = await get_dataset_schemas_summary(dataset_ids)
                    system_prompt += f"\n\nYou have access to database querying capabilities. Use valid SQL queries to aggregate and summarize data.\n{schema_summary}"
                    
                # Always enable the chart rendering tool
                chart_tool = get_tool_instance("render_chart")
                active_tools[chart_tool.name] = chart_tool
                tools_payload.append(chart_tool.get_schema())
                system_prompt += "\n\nWhen a user asks to visualize, plot, or chart data, you MUST first run `run_sql_query` (if needed) to fetch the raw data, and then immediately run `render_chart` to plot the results visually. Do not try to write Markdown tables if the user explicitly asks for a chart."
                
                from app.database import AsyncSessionLocal
                async with AsyncSessionLocal() as local_db:
                    history_result = await local_db.execute(
                        select(AIChatMessage)
                        .where(AIChatMessage.session_id == session_id)
                        .order_by(AIChatMessage.created_at.asc())
                        .limit(10)
                    )
                    history = history_result.scalars().all()
                    
                    messages = [{"role": "system", "content": system_prompt}]
                    for m in history:
                        messages.append({"role": "user" if m.role == "user" else "assistant", "content": m.content})
                    if not any(m.content == request.content for m in history):
                        messages.append({"role": "user", "content": request.content})
                
                req_headers = prepare_headers(api_key, api_type, custom_headers)
                url = prepare_url(base_url, api_type)
                
                max_turns = 20
                turn = 0
                
                async with httpx.AsyncClient() as client:
                    while turn < max_turns:
                        turn += 1
                        payload_messages, payload_system = prepare_messages(messages, api_type, system_prompt)
                        payload = {
                            "model": model_name,
                            "messages": payload_messages,
                            "temperature": 0.7,
                            "stream": True
                        }
                        if payload_system is not None:
                            payload["system"] = payload_system
                        if api_type == "messages":
                            payload["max_tokens"] = 4096
                        if tools_payload:
                            payload["tools"] = prepare_tools(tools_payload, api_type)
 
                        # Variables for current turn streaming
                        current_tool_calls_dict = {}
 
                        async with client.stream("POST", url, json=payload, headers=req_headers, timeout=httpx.Timeout(30.0, read=120.0)) as response:
                            if response.status_code == 200:
                                if api_type == "messages":
                                    async for line in response.aiter_lines():
                                        openai_chunk, txt_delta, think_delta = parse_anthropic_stream_line(line, current_tool_calls_dict)
                                        if openai_chunk:
                                            yield f"data: {json.dumps(openai_chunk)}\n\n"
                                        if txt_delta:
                                            ai_content += txt_delta
                                        if think_delta:
                                            reasoning_content += think_delta
                                else:
                                    raw_buffer = b""
                                    async for raw_chunk in response.aiter_raw():
                                        # Zero-buffer: forward raw bytes instantly
                                        yield raw_chunk.decode("utf-8", errors="ignore")
                                        raw_buffer += raw_chunk
                                    
                                    # Parse accumulated buffer AFTER stream ends (no inline jitter)
                                    full_text = raw_buffer.decode("utf-8", errors="ignore")
                                    for line in full_text.split("\n"):
                                        line = line.strip()
                                        if not line or not line.startswith("data:"):
                                            continue
                                        data_str = line[5:].strip()
                                        if data_str == "[DONE]":
                                            continue
                                        try:
                                            chunk_json = json.loads(data_str)
                                            choice = chunk_json.get("choices", [{}])[0]
                                            delta = choice.get("delta", {})
                                            
                                            reasoning = delta.get("reasoning") or delta.get("reasoning_content") or delta.get("thinking") or ""
                                            if reasoning:
                                                reasoning_content += reasoning
                                                
                                            content = delta.get("content") or ""
                                            if content:
                                                ai_content += content
                                                
                                            tcs = delta.get("tool_calls", [])
                                            for tc in tcs:
                                                idx = tc.get("index")
                                                if idx not in current_tool_calls_dict:
                                                    current_tool_calls_dict[idx] = {"id": tc.get("id"), "function": {"name": tc.get("function", {}).get("name", ""), "arguments": tc.get("function", {}).get("arguments", "")}}
                                                else:
                                                    if tc.get("id"):
                                                        current_tool_calls_dict[idx]["id"] = tc["id"]
                                                    if tc.get("function", {}).get("name"):
                                                        current_tool_calls_dict[idx]["function"]["name"] = tc["function"]["name"]
                                                    if tc.get("function", {}).get("arguments"):
                                                        current_tool_calls_dict[idx]["function"]["arguments"] += tc["function"]["arguments"]
                                        except Exception:
                                            pass
                            else:
                                error_body = (await response.aread()).decode("utf-8", errors="ignore")[:200]
                                error_text = f"LLM Error {response.status_code}: {error_body}"
                                ai_content += error_text
                                yield f"data: {json.dumps({'choices': [{'delta': {'content': error_text}}]})}\n\n"
                                break

                        # After the stream finishes, process tools if any were called
                        if current_tool_calls_dict:
                            # Append assistant message with tool calls
                            assistant_msg = {
                                "role": "assistant",
                                "content": ai_content,
                                "tool_calls": [{"id": tc["id"], "type": "function", "function": {"name": tc["function"]["name"], "arguments": tc["function"]["arguments"]}} for tc in current_tool_calls_dict.values()]
                            }
                            messages.append(assistant_msg)
                            
                            for idx, tc in current_tool_calls_dict.items():
                                tool_call_id = tc["id"]
                                func_name = tc["function"]["name"]
                                func_args_str = tc["function"]["arguments"]
                                
                                tool_calls.append({"id": tool_call_id, "name": func_name, "arguments": func_args_str})
                                
                                result_str = ""
                                if func_name in active_tools:
                                    tool_instance = active_tools[func_name]
                                    try:
                                        args = json.loads(func_args_str)
                                        result_str = await tool_instance.execute(**args)
                                    except Exception as e:
                                        result_str = f"Error executing tool: {str(e)}"
                                else:
                                    result_str = f"Tool {func_name} not found."
                                
                                tool_results.append({"tool_call_id": tool_call_id, "name": func_name, "result": result_str})
                                messages.append({"role": "tool", "tool_call_id": tool_call_id, "name": func_name, "content": result_str})
                                
                                # Send custom SSE event for tool execution result
                                yield f"data: {json.dumps({'event': 'tool_result', 'tool_call_id': tool_call_id, 'name': func_name, 'result': result_str})}\n\n"
                                await asyncio.sleep(0.1)
                        else:
                            break # No tool calls, finish loop

            except Exception as e:
                error_msg = f"\n\nFailed to connect to AI engine: {str(e)}"
                ai_content += error_msg
                yield f"data: {json.dumps({'choices': [{'delta': {'content': error_msg}}]})}\n\n"
 
        from app.database import AsyncSessionLocal
        async with AsyncSessionLocal() as local_db:
            ai_msg = AIChatMessage(
                session_id=session_id,
                role="ai",
                content=ai_content,
                reasoning_content=reasoning_content if reasoning_content else None,
                tool_calls=tool_calls if tool_calls else None,
                tool_results=tool_results if tool_results else None
            )
            local_db.add(ai_msg)
            
            # --- AUDIT LOGGING ---
            from app.audit.utils import is_audit_logging_enabled
            if await is_audit_logging_enabled(local_db):
                from app.models import AuditLog
                bot_name = bot.name if hasattr(bot, 'name') and bot.name else "Dashboard Chat Bot" if bot.bot_id == "dashboard" else bot.bot_id
                if dashboard_name:
                    bot_name = f"{bot_name} ({dashboard_name})"
                bot_source = "Dashboard" if bot.bot_id == "dashboard" else "AI Workspace"
                
                audit_log = AuditLog(
                    user_id=current_user.id,
                    action="query_bot",
                    entity_id=session_id,
                    details={
                        "prompt": request.content,
                        "bot_id": bot.bot_id,
                        "bot_name": bot_name,
                        "source": bot_source,
                        "tool_calls": tool_calls if tool_calls else [],
                    }
                )
                local_db.add(audit_log)
            # ---------------------
            
            await local_db.commit()
            await local_db.refresh(ai_msg)
            # Re-yield [DONE] or final state to tell frontend we are completely finished
            yield f"data: {json.dumps({'event': 'done', 'message': {'id': ai_msg.id, 'role': 'ai', 'content': ai_content, 'reasoning_content': reasoning_content, 'tool_calls': tool_calls, 'tool_results': tool_results, 'created_at': ai_msg.created_at.isoformat()}})}\n\n"
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/sessions/{session_id}/messages", response_model=AIChatMessageSchema)
async def add_chat_message(
    session_id: str,
    request: AIChatMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch Session and Bot
    session_result = await db.execute(
        select(AIChatSession).where(AIChatSession.id == session_id, AIChatSession.user_id == current_user.id)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    bot_result = await db.execute(
        select(AIBot).where(AIBot.bot_id == session.bot_id)
    )
    bot = bot_result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot configuration not found")

    # 2. Save User Message
    user_msg = AIChatMessage(
        session_id=session_id,
        role="user",
        content=request.content
    )
    db.add(user_msg)
    await db.flush() # Get ID for user message
    
    dashboard_name = getattr(request, "dashboard_name", None)
    
    # 3. Resolve AI Response (Real LLM or Mock)
    llm_config = bot.llm_config or {}
    base_url = llm_config.get("base_url")
    api_key = llm_config.get("api_key")
    model_name = llm_config.get("model_name", "gpt-4o")
    system_prompt = llm_config.get("system_prompt", "You are a helpful assistant.")
    api_type = llm_config.get("api_type") or llm_config.get("api_type", "chat_completions")
    custom_headers = llm_config.get("headers", {})

    ai_content = ""

    if base_url:
        try:
            import httpx
            # Fetch last few messages for context
            history_result = await db.execute(
                select(AIChatMessage)
                .where(AIChatMessage.session_id == session_id)
                .order_by(AIChatMessage.created_at.asc())
                .limit(10)
            )
            history = history_result.scalars().all()
            
            messages = [{"role": "system", "content": system_prompt}]
            for m in history:
                messages.append({"role": "user" if m.role == "user" else "assistant", "content": m.content})
            
            # Add current message if not already in history (it should be since we flushed)
            if not any(m.id == user_msg.id for m in history):
                messages.append({"role": "user", "content": request.content})

            from app.ai.utils import prepare_url, prepare_headers, prepare_messages

            headers = prepare_headers(api_key, api_type, custom_headers)
            url = prepare_url(base_url, api_type)
            payload_messages, payload_system = prepare_messages(messages, api_type, system_prompt)
            payload = {
                "model": model_name,
                "messages": payload_messages,
                "temperature": 0.7,
                "stream": False
            }
            if payload_system is not None:
                payload["system"] = payload_system
            if api_type == "messages":
                payload["max_tokens"] = 4096

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if api_type == "messages":
                        ai_content = ""
                        for block in data.get("content", []):
                            if block.get("type") == "text":
                                ai_content += block.get("text", "")
                    else:
                        ai_content = data["choices"][0]["message"]["content"]
                else:
                    ai_content = f"Error from LLM Provider ({response.status_code}): {response.text[:200]}"
        except Exception as e:
            ai_content = f"Failed to connect to AI engine: {str(e)}"
    else:
        ai_content = "⚠️ No LLM endpoint configured. Please configure connectivity settings for this assistant."

    ai_msg = AIChatMessage(
        session_id=session_id,
        role="ai",
        content=ai_content
    )
    db.add(ai_msg)
    
    # --- AUDIT LOGGING ---
    from app.audit.utils import is_audit_logging_enabled
    if await is_audit_logging_enabled(db):
        from app.models import AuditLog
        bot_name = bot.name if hasattr(bot, 'name') and bot.name else "Dashboard Chat Bot" if bot.bot_id == "dashboard" else bot.bot_id
        if dashboard_name:
            bot_name = f"{bot_name} ({dashboard_name})"
        bot_source = "Dashboard" if bot.bot_id == "dashboard" else "AI Workspace"
        
        audit_log = AuditLog(
            user_id=current_user.id,
            action="query_bot",
            entity_id=session_id,
            details={
                "prompt": request.content,
                "bot_id": bot.bot_id,
                "bot_name": bot_name,
                "source": bot_source,
                "tool_calls": []
            }
        )
        db.add(audit_log)
    # ---------------------
    
    await db.commit()
    await db.refresh(ai_msg)
    return ai_msg

from pydantic import BaseModel
class TitleGenerateRequest(BaseModel):
    message: str

@router.post("/sessions/{session_id}/generate-title")
async def generate_chat_title(
    session_id: str,
    request: TitleGenerateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    session_result = await db.execute(
        select(AIChatSession).where(AIChatSession.id == session_id, AIChatSession.user_id == current_user.id)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    bot_result = await db.execute(
        select(AIBot).where(AIBot.bot_id == session.bot_id)
    )
    bot = bot_result.scalar_one_or_none()
    if not bot or not bot.llm_config or not bot.llm_config.get("base_url"):
        return {"title": "New Chat"}

    llm_config = bot.llm_config
    base_url = llm_config.get("base_url")
    api_key = llm_config.get("api_key")
    model_name = llm_config.get("model_name", "gpt-4o")
    api_type = llm_config.get("api_type") or llm_config.get("api_type", "chat_completions")
    custom_headers = llm_config.get("headers", {})

    from app.ai.utils import prepare_url, prepare_headers, prepare_messages
    
    req_headers = prepare_headers(api_key, api_type, custom_headers)
    url = prepare_url(base_url, api_type)
    
    openai_messages = [
        {"role": "system", "content": "You are a title generator. Generate a short, concise title (max 3-4 words) for this conversation based on the user's first message. Respond with JUST the string title, nothing else, no quotes."},
        {"role": "user", "content": request.message}
    ]
    payload_messages, payload_system = prepare_messages(openai_messages, api_type, openai_messages[0]["content"])
    
    payload = {
        "model": model_name,
        "messages": payload_messages,
        "temperature": 0.5,
        "stream": False,
        "max_tokens": 15
    }
    if payload_system is not None:
        payload["system"] = payload_system

    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=req_headers, timeout=30.0)
            if response.status_code == 200:
                data = response.json()
                if api_type == "messages":
                    title = ""
                    for block in data.get("content", []):
                        if block.get("type") == "text":
                            title += block.get("text", "")
                    title = title.strip(' "\'')
                else:
                    title = data.get("choices", [{}])[0].get("message", {}).get("content", "New Chat").strip(' "\'')
                if title:
                    session.title = title
                    await db.commit()
                    return {"title": title}
            else:
                print(f"Error from LLM: {response.status_code} {response.text}")
                # Fallback: use first few words of user message
                fallback_title = " ".join(request.message.split()[:4]) + "..."
                session.title = fallback_title
                await db.commit()
                return {"title": fallback_title}
    except Exception as e:
        print(f"Error generating title: {e}")
        # Fallback on exception
        fallback_title = " ".join(request.message.split()[:4]) + "..."
        session.title = fallback_title
        await db.commit()
        return {"title": fallback_title}

    return {"title": session.title}

@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(delete(AIChatSession).where(AIChatSession.id == session_id, AIChatSession.user_id == current_user.id))
    await db.commit()
    return {"status": "deleted"}

@router.post("/nl-to-sql", response_model=NLToSQLResponse)
async def nl_to_sql(
    request: NLToSQLRequest,
    current_user: User = Depends(get_current_active_user)
):
    raise HTTPException(status_code=501, detail="NL-to-SQL requires a configured LLM endpoint. Please set up an AI assistant with a valid LLM connection.")

@router.post("/summary", response_model=AISummaryResponse)
async def get_ai_summary(
    request: AISummaryRequest,
    current_user: User = Depends(get_current_active_user)
):
    raise HTTPException(status_code=501, detail="AI Summary requires a configured LLM endpoint. Please set up an AI assistant with a valid LLM connection.")
