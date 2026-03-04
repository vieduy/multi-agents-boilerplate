"""Simplified FastAPI agent server - Direct agent.run() pattern.

Following examples from:
- /legacy/agent-framework/python/samples/01-get-started/
- /legacy/agent-framework/python/samples/02-agents/conversations/

No DevUI infrastructure. Just the agent with session-based conversations.
"""

import logging
import os
import json
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Security, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from agent_framework import AgentSession

from .agent import agent
from .request_context import set_session_attributes

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Session management
# ---------------------------------------------------------------------------
# IMPORTANT: RedisHistoryProvider automatically loads history by session_id.
# We DON'T cache sessions because creating a new AgentSession with the same
# session_id will load existing history from Redis automatically.
# This follows the DevUI pattern: always create fresh session, provider handles history.

def get_or_create_session(session_id: str | None = None) -> tuple[str, AgentSession]:
    """Get or create session.

    Creates AgentSession with the given session_id (or generates new one).
    If RedisHistoryProvider is enabled, it will automatically load history
    from Redis for this session_id.

    This pattern follows DevUI's get_session() implementation.
    """
    # Create session - RedisHistoryProvider loads history automatically
    session = agent.create_session(session_id=session_id)
    conv_id = session.session_id

    logger.debug(f"Session {conv_id} - RedisHistoryProvider will load history if exists")
    return conv_id, session

# ---------------------------------------------------------------------------
# FastAPI lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown."""
    logger.info(f"✅ Started QA Agent: {agent.name}")
    logger.info(f"   Description: {agent.description}")

    # Get tool count from agent.py imports
    from .agent import tools
    logger.info(f"   Tools loaded: {len(tools)}")

    redis_url = os.environ.get("REDIS_URL")
    if redis_url:
        logger.info(f"   Redis: {redis_url}")
    else:
        logger.info("   Redis: Not configured (in-memory history only)")

    yield
    logger.info("🛑 Agent server shutting down.")


app = FastAPI(
    title="QA Agent (Simplified)",
    description="Direct agent.run() pattern - no DevUI infrastructure",
    version="2.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS middleware
# ---------------------------------------------------------------------------

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

security_scheme = HTTPBearer(auto_error=False)
_EXPECTED_TOKEN = os.environ.get("AGENT_API_TOKEN", "")


async def verify_token(
    credentials: HTTPAuthorizationCredentials | None = Security(security_scheme),
) -> str:
    """Standard Bearer token authentication."""
    if not _EXPECTED_TOKEN:
        logger.debug("Auth disabled (AGENT_API_TOKEN not set).")
        token = (credentials.credentials if credentials else "") or ""
        return token

    if not credentials or credentials.credentials != _EXPECTED_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


# ---------------------------------------------------------------------------
# Request/Response Models
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    query: str | None = None
    session_id: str | None = None
    stream: bool = False
    session_attributes: dict[str, Any] | None = None

    def get_message(self) -> str:
        return self.query

    def get_session_id(self) -> str | None:
        return self.session_id


class ChatResponse(BaseModel):
    session_id: str
    response: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    from .agent import TOOL_MAP

    redis_enabled = bool(os.environ.get("REDIS_URL"))

    return {
        "status": "healthy",
        "agent": agent.name,
        "agent_description": agent.description,
        "tools": list(TOOL_MAP.keys()),
        "redis_history": "enabled" if redis_enabled else "disabled (in-memory only)"
    }


@app.post("/chat")
async def chat(
    request: ChatRequest,
    token: str = Depends(verify_token),
):
    print(request)
    """Unified chat endpoint - handles both streaming and non-streaming responses.

    Set stream=true in the request body to enable Server-Sent Events (SSE) streaming.
    Set stream=false (default) for a standard JSON response.
    """
    # Set session attributes for tools
    session_attrs = request.session_attributes or {}
    if token and "jwt_token" not in session_attrs:
        session_attrs["jwt_token"] = token
    set_session_attributes(session_attrs)

    # Get or create session
    conv_id, session = get_or_create_session(request.get_session_id())

    # Handle streaming response
    if request.stream:
        async def stream_response():
            """Stream agent responses as Server-Sent Events."""
            try:
                # Send conversation ID first
                yield f"data: {json.dumps({'session_id': conv_id, 'type': 'session'})}\n\n"

                # Create the stream from agent.run()
                response_stream = agent.run(request.get_message(), session=session, stream=True)

                # Stream agent responses
                async for chunk in response_stream:
                    # Extract text from chunk
                    text = ""
                    if hasattr(chunk, 'text'):
                        text = chunk.text
                    elif hasattr(chunk, 'contents'):
                        for content in chunk.contents:
                            if hasattr(content, 'text'):
                                text += content.text

                    if text:
                        yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"

                # CRITICAL: Call get_final_response() to trigger the _post_hook
                # which runs after_run() on all context providers, including
                # RedisHistoryProvider.after_run() that saves history to Redis
                final_response = await response_stream.get_final_response()
                logger.debug(f"Streaming completed for session {conv_id}, history saved via after_run() hook")

                # Send completion
                yield f"data: {json.dumps({'type': 'done'})}\n\n"

            except Exception as e:
                logger.exception(f"Error in streaming: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        return StreamingResponse(
            stream_response(),
            media_type="text/event-stream",
        )

    # Handle non-streaming response
    try:
        # Direct agent.run() call - simple pattern from examples!
        result = await agent.run(request.get_message(), session=session)

        # Extract response text
        response_text = result.text if hasattr(result, 'text') else str(result)

        return ChatResponse(
            session_id=conv_id,
            response=response_text
        )

    except Exception as e:
        logger.exception(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sessions")
async def create_session(request: Request):
    """Router compatibility: support session creation."""
    try:
        data = await request.json()
    except Exception:
        data = {}
    
    # Extract session_id if provided in metadata (router often does this)
    metadata = data.get("metadata", {})
    session_id = metadata.get("session_id")
    
    # Create or get session
    conv_id, session = get_or_create_session(session_id)
    
    return {
        "id": conv_id,
        "metadata": metadata,
        "session_state": session.state
    }


@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session info.

    Creates a fresh AgentSession with this session_id.
    If RedisHistoryProvider is enabled, it will load history from Redis.
    """
    # Create session - provider loads history if exists
    session = agent.create_session(session_id=session_id)

    return {
        "session_id": session.session_id,
        "session_state": session.state,
        "note": "History loaded from RedisHistoryProvider if REDIS_URL is set"
    }


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete session history from Redis.

    Note: This requires RedisHistoryProvider to be enabled.
    Actual Redis cleanup would need to be implemented.
    """
    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete - REDIS_URL not configured (using in-memory history)"
        )

    # TODO: Implement Redis cleanup if needed
    logger.info(f"Delete requested for session: {session_id}")
    return {
        "deleted": True,
        "session_id": session_id,
        "note": "History may still exist in Redis (cleanup not implemented)"
    }


# ---------------------------------------------------------------------------
# Development server
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8090,
        reload=True
    )
