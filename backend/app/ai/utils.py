import json
from typing import Dict, Any, List, Tuple, Optional

def prepare_url(base_url: str, api_type: str) -> str:
    if not base_url:
        return ""
    base_url = base_url.rstrip("/")
    if api_type == "messages":
        return base_url + "/v1/messages" if "/v1/messages" not in base_url else base_url
    else:
        return base_url + "/chat/completions" if "/chat/completions" not in base_url else base_url

def prepare_headers(api_key: str, api_type: str, custom_headers: Dict[str, str]) -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    for k, v in custom_headers.items():
        headers[k] = v
        
    if api_type == "messages":
        lower_headers = {k.lower(): k for k in headers.keys()}
        if "anthropic-version" not in lower_headers:
            headers["anthropic-version"] = "2023-06-01"
            
        if api_key:
            if "x-api-key" not in lower_headers and "authorization" not in lower_headers:
                headers["x-api-key"] = api_key
    else:
        if api_key:
            lower_headers = {k.lower(): k for k in headers.keys()}
            if "authorization" not in lower_headers:
                headers["Authorization"] = f"Bearer {api_key}"
    return headers

def prepare_tools(tools_payload: List[Dict[str, Any]], api_type: str) -> List[Dict[str, Any]]:
    if api_type == "messages" and tools_payload:
        anthropic_tools = []
        for tool in tools_payload:
            func = tool.get("function", {})
            anthropic_tools.append({
                "name": func["name"],
                "description": func["description"],
                "input_schema": func["parameters"]
            })
        return anthropic_tools
    return tools_payload

def map_openai_message_to_anthropic(msg: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    role = msg.get("role")
    content = msg.get("content") or ""
    
    if role == "user":
        return {"role": "user", "content": content}
    
    elif role == "assistant":
        tool_calls = msg.get("tool_calls")
        if not tool_calls:
            return {"role": "assistant", "content": content}
        
        blocks = []
        if content:
            blocks.append({"type": "text", "text": content})
        for tc in tool_calls:
            func = tc.get("function") or {}
            name = func.get("name") or tc.get("name") or ""
            args_str = func.get("arguments") or tc.get("arguments") or "{}"
            
            try:
                args = json.loads(args_str) if isinstance(args_str, str) else args_str
            except Exception:
                args = {}
            blocks.append({
                "type": "tool_use",
                "id": tc["id"],
                "name": name,
                "input": args
            })
        return {"role": "assistant", "content": blocks}
    
    elif role == "tool":
        tool_call_id = msg.get("tool_call_id") or msg.get("id") or ""
        return {
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": tool_call_id,
                    "content": content
                }
            ]
        }
    return None

def prepare_messages(openai_messages: List[Dict[str, Any]], api_type: str, system_prompt: str) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Converts a list of OpenAI messages to either OpenAI format or Anthropic Messages format.
    Returns (messages_payload, system_prompt_for_payload).
    """
    if api_type == "messages":
        anthropic_msgs = []
        for m in openai_messages:
            if m.get("role") == "system":
                continue
            
            mapped = map_openai_message_to_anthropic(m)
            if not mapped:
                continue
                
            if anthropic_msgs and anthropic_msgs[-1]["role"] == mapped["role"]:
                last_content = anthropic_msgs[-1]["content"]
                new_content = mapped["content"]
                
                if isinstance(last_content, str):
                    last_blocks = [{"type": "text", "text": last_content}] if last_content else []
                else:
                    last_blocks = last_content
                    
                if isinstance(new_content, str):
                    new_blocks = [{"type": "text", "text": new_content}] if new_content else []
                else:
                    new_blocks = new_content
                    
                anthropic_msgs[-1]["content"] = last_blocks + new_blocks
            else:
                anthropic_msgs.append(mapped)
                
        for msg in anthropic_msgs:
            if isinstance(msg["content"], list):
                msg["content"] = [b for b in msg["content"] if not (b.get("type") == "text" and not b.get("text"))]
                if len(msg["content"]) == 1 and msg["content"][0].get("type") == "text":
                    msg["content"] = msg["content"][0]["text"]
                elif not msg["content"]:
                    msg["content"] = ""
                    
        return anthropic_msgs, system_prompt
    else:
        has_system = any(m.get("role") == "system" for m in openai_messages)
        if not has_system and system_prompt:
            return [{"role": "system", "content": system_prompt}] + openai_messages, None
        return openai_messages, None

def parse_anthropic_stream_line(line: str, current_tool_calls_dict: Dict[int, Dict[str, Any]]) -> Tuple[Optional[Dict[str, Any]], str, str]:
    """
    Parses a single Anthropic SSE event string and converts it to OpenAI delta format chunk.
    Returns: (openai_chunk, text_delta, thinking_delta)
    """
    line = line.strip()
    if not line or not line.startswith("data:"):
        return None, "", ""
    data_str = line[5:].strip()
    if data_str == "[DONE]":
        return None, "", ""
    try:
        event_data = json.loads(data_str)
        event_type = event_data.get("type")
        
        if event_type == "content_block_start":
            idx = event_data.get("index")
            cb = event_data.get("content_block", {})
            if cb.get("type") == "tool_use":
                tc_id = cb.get("id")
                tc_name = cb.get("name")
                current_tool_calls_dict[idx] = {
                    "id": tc_id,
                    "function": {
                        "name": tc_name,
                        "arguments": ""
                    }
                }
                openai_chunk = {
                    "choices": [{
                        "delta": {
                            "tool_calls": [{
                                "index": idx,
                                "id": tc_id,
                                "function": {
                                    "name": tc_name,
                                    "arguments": ""
                                }
                            }]
                        }
                    }]
                }
                return openai_chunk, "", ""
                
        elif event_type == "content_block_delta":
            idx = event_data.get("index")
            delta = event_data.get("delta", {})
            delta_type = delta.get("type")
            
            if delta_type == "text_delta":
                text = delta.get("text", "")
                openai_chunk = {
                    "choices": [{
                        "delta": {
                            "content": text
                        }
                    }]
                }
                return openai_chunk, text, ""
                
            elif delta_type == "thinking_delta":
                thinking = delta.get("thinking", "")
                openai_chunk = {
                    "choices": [{
                        "delta": {
                            "reasoning_content": thinking
                        }
                    }]
                }
                return openai_chunk, "", thinking
                
            elif delta_type == "input_json_delta":
                partial_json = delta.get("partial_json", "")
                if idx in current_tool_calls_dict:
                    current_tool_calls_dict[idx]["function"]["arguments"] += partial_json
                openai_chunk = {
                    "choices": [{
                        "delta": {
                            "tool_calls": [{
                                "index": idx,
                                "function": {
                                    "arguments": partial_json
                                }
                            }]
                        }
                    }]
                }
                return openai_chunk, "", ""
                
    except Exception:
        pass
        
    return None, "", ""
