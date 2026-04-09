"""
Python Agent that acts as an orchestrator for MCP tools and LLM interactions.
Uses FastAPI for HTTP API and FastMCP client to communicate with MCP server.
"""

import json
import os
import asyncio
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any

# Import FastMCP client
from fastmcp import Client

# Configuration
MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:9000/mcp")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://d1rs-wvaw1-mcu:8000/v1")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_DEFAULT_MODEL = os.getenv("LLM_DEFAULT_MODEL", "EXO/mlx-community/Qwen3-Coder-Next-8bit")

# Create FastAPI app
app = FastAPI(title="MCP Python Agent", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



class ChatRequest(BaseModel):
    messages: list[dict[str, Any]]
    tools: Optional[list[dict[str, Any]]] = None
    model: Optional[str] = None
    return_tool_calls_immediately: Optional[bool] = False


class ToolCallData(BaseModel):
    id: str
    type: str
    function: dict[str, Any]


class ToolResultData(BaseModel):
    tool_call_id: str
    name: str
    arguments: dict[str, Any]
    content: list[dict[str, Any]]
    isError: Optional[bool] = None


class ChatResponse(BaseModel):
    id: str
    object: str
    created: int
    model: str
    choices: list[dict[str, Any]]
    tool_calls: Optional[list[dict[str, Any]]] = None
    tool_results: Optional[list[dict[str, Any]]] = None


class ToolCallRequest(BaseModel):
    name: str
    arguments: dict[str, Any]


class ToolCallResponse(BaseModel):
    content: list[dict[str, Any]]
    isError: Optional[bool] = None


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/tools")
async def list_tools():
    """List available MCP tools."""
    try:
        client = Client(MCP_SERVER_URL)
        async with client:
            tools = await client.list_tools()
            print(tools)
            # Extract tool information in a format compatible with the UI
            tool_list = []
            for tool in tools:
                tool_dict = tool.model_dump()
                # FastMCP tools may have 'name' directly or nested
                tool_name = tool_dict.get('name') or tool_dict.get('method') or (tool_dict.get('function') or {}).get('name') or "unknown"
                # Get description from the tool's docstring if not available in model_dump
                description = tool_dict.get('description')
                if description is None:
                    description = getattr(tool, '__doc__', '') or ''
                tool_list.append({
                    "name": tool_name or "unknown",
                    "description": description or 'No description available.',
                    "inputSchema": tool_dict.get('parameters', {})
                })
            return {"tools": tool_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing tools: {str(e)}")


@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Send a chat request and handle tool calls automatically.
    This endpoint:
    1. Sends the message to the LLM
    2. If tool calls are requested, executes them via FastMCP
    3. Sends tool results back to the LLM for final response
    """
    model = request.model or LLM_DEFAULT_MODEL
    
    # print(f"=== Chat Request ===")
    # print(f"Tools received: {len(request.tools or [])}")
    # print(f"Tool names: {[t.get('name') for t in request.tools['function'] or []]}")

    async with httpx.AsyncClient() as client:
        headers = {"Content-Type": "application/json"}
        if LLM_API_KEY:
            headers["Authorization"] = f"Bearer {LLM_API_KEY}"

        # First request to LLM
        payload = {
            "model": model,
            "messages": request.messages,
            "tools": request.tools or [],
            "stream": False,
        }

        try:
            response = await client.post(
                f"{LLM_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            result = response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"LLM API request failed: {e.response.text}",
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error calling LLM: {str(e)}")

        # Parse response
        choice = result.get("choices", [])[0] if result.get("choices") else {}
        message = choice.get("message", {})
        tool_calls = message.get("tool_calls", [])
        
        print(f"LLM Response:")
        print(f"  Tool calls count: {len(tool_calls)}")
        print(f"  Tool call IDs: {[tc.get('id') for tc in tool_calls]}")
        print(f"  Tool call names: {[tc.get('function', {}).get('name') for tc in tool_calls]}")

        if not tool_calls:
            # No tool calls - return regular response
            return ChatResponse(
                id=result.get("id", ""),
                object="chat.completion",
                created=result.get("created", 0),
                model=result.get("model", model),
                choices=[{
                    "index": 0,
                    "message": {
                        "role": message.get("role", "assistant"),
                        "content": message.get("content"),
                    },
                    "finish_reason": choice.get("finish_reason", "stop"),
                }],
            )

        # If return_tool_calls_immediately is True, return tool calls without executing
        if request.return_tool_calls_immediately:
            return ChatResponse(
                id=result.get("id", ""),
                object="chat.completion",
                created=result.get("created", 0),
                model=result.get("model", model),
                choices=[{
                    "index": 0,
                    "message": {
                        "role": message.get("role", "assistant"),
                        "content": message.get("content", ""),
                    },
                    "finish_reason": choice.get("finish_reason", "stop"),
                }],
                tool_calls=tool_calls,
                tool_results=[],
            )

        # Execute tool calls via FastMCP
        tool_results = []
        mcp_client = Client(MCP_SERVER_URL)
        async with mcp_client:
            for tool_call in tool_calls:
                tool_name = tool_call.get("function", {}).get("name", "")
                tool_args_str = tool_call.get("function", {}).get("arguments", "{}")
                tool_args = json.loads(tool_args_str) if isinstance(tool_args_str, str) else tool_args_str
                tool_id = tool_call.get("id", "")

                try:
                    # Execute tool via FastMCP
                    tool_result = await mcp_client.call_tool(tool_name, tool_args)
                    # print(tool_result)
                
                    # Convert tool result to format expected by LLM
                    content = []
                    if hasattr(tool_result, 'content') and hasattr(tool_result.content, '__getitem__') and len(tool_result.content) > 0:
                        # FastMCP tool result with content attribute
                        content = [{"type": "text", "text": str(tool_result.content[0].text)}]
                    elif hasattr(tool_result, 'data'):
                        # FastMCP tool result with data attribute
                        content = [{"type": "text", "text": str(tool_result.data)}]
                    elif isinstance(tool_result, dict):
                        content = [{"type": "text", "text": str(tool_result)}]
                    else:
                        content = [{"type": "text", "text": str(tool_result)}]

                    tool_results.append({
                        "tool_call_id": tool_id,
                        "name": tool_name,
                        "arguments": tool_args,
                        "content": content,
                        "isError": False,
                    })
                except Exception as e:
                    tool_results.append({
                        "tool_call_id": tool_id,
                        "name": tool_name,
                        "arguments": tool_args,
                        "content": [{"type": "text", "text": f"Error: {str(e)}"}],
                        "isError": True,
                    })

        # Build messages with tool results
        # Create a copy of request messages to avoid modifying the original
        tool_response_messages = [
            {
                "role": "tool",
                "tool_call_id": tr["tool_call_id"],
                "content": tr["content"][0].get("text", "") if tr["content"] else "",
            }
            for tr in tool_results
        ]

        # Build the message history for the second LLM call
        # Start with a fresh history that includes the original messages
        final_messages = []
        
        # Add all original messages except tool messages (tools are sent fresh)
        for msg in request.messages:
            if msg.get("role") != "tool":
                final_messages.append(msg)
        
        # Add the assistant message with tool calls
        # Note: tool_calls should only be in the message that requests the tool call
        # The response after tool results should NOT have tool_calls
        final_messages.append({
            "role": "assistant",
            "content": message.get("content", ""),
        })
        
        # Add tool result messages
        final_messages.extend(tool_response_messages)

        payload["messages"] = final_messages
        payload["stream"] = False

        try:
            final_response = await client.post(
                f"{LLM_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            )
            final_response.raise_for_status()
            final_result = final_response.json()
        except Exception as e:
            print(e)
            raise HTTPException(status_code=500, detail=f"Error calling LLM with tool results: {str(e)}")

        final_choice = final_result.get("choices", [])[0] if final_result.get("choices") else {}
        final_message = final_choice.get("message", {})

        # Build final response with tool call information
        response_data = ChatResponse(
            id=final_result.get("id", ""),
            object="chat.completion",
            created=final_result.get("created", 0),
            model=final_result.get("model", model),
            choices=[{
                "index": 0,
                "message": {
                    "role": final_message.get("role", "assistant"),
                    "content": final_message.get("content"),
                },
                "finish_reason": final_choice.get("finish_reason", "stop"),
            }],
        )
        
        # Add tool call information to response
        response_data.tool_calls = tool_calls
        response_data.tool_results = tool_results
        
        return response_data


class ToolCallBatchRequest(BaseModel):
    tool_calls: list[dict[str, Any]]


@app.post("/tools/call-batch")
async def call_tool_batch(request: ToolCallBatchRequest):
    """Call multiple MCP tools and return results."""
    results = []
    
    try:
        client = Client(MCP_SERVER_URL)
        async with client:
            for tool_call in request.tool_calls:
                tool_name = tool_call.get("function", {}).get("name", "")
                tool_args_str = tool_call.get("function", {}).get("arguments", "{}")
                tool_args = json.loads(tool_args_str) if isinstance(tool_args_str, str) else tool_args_str
                tool_id = tool_call.get("id", "")

                try:
                    result = await client.call_tool(tool_name, tool_args)
                    
                    content = []
                    if hasattr(result, 'content') and hasattr(result.content, '__getitem__') and len(result.content) > 0:
                        # FastMCP tool result with content attribute
                        content = [{"type": "text", "text": str(result.content[0].text)}]
                    elif hasattr(result, 'data'):
                        # FastMCP tool result with data attribute
                        content = [{"type": "text", "text": str(result.data)}]
                    elif isinstance(result, dict):
                        content = [{"type": "text", "text": str(result)}]
                    else:
                        content = [{"type": "text", "text": str(result)}]

                    results.append({
                        "tool_call_id": tool_id,
                        "content": content,
                        "isError": False,
                    })
                except Exception as e:
                    results.append({
                        "tool_call_id": tool_id,
                        "content": [{"type": "text", "text": f"Error: {str(e)}"}],
                        "isError": True,
                    })
        
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling tools: {str(e)}")


@app.post("/tools/call")
async def call_tool(request: ToolCallRequest):
    """Call a specific MCP tool."""
    try:
        client = Client(MCP_SERVER_URL)
        async with client:
            result = await client.call_tool(request.name, request.arguments)
        
        content = []
        if hasattr(result, 'data'):
            content = [{"type": "text", "text": str(result.data)}]
        elif isinstance(result, dict):
            content = [{"type": "text", "text": str(result)}]
        else:
            content = [{"type": "text", "text": str(result)}]

        return {
            "content": content,
            "isError": False,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling tool: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
