# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a **QA Agent** FastAPI service built on the `agent-framework` ecosystem. It's designed to be a stateless, self-contained agent that integrates with an Agent Router using Bearer token authentication. The agent supports session-based conversations with optional Redis persistence.

## Development Commands

### Running Locally
```bash
# Setup
cp .env.example .env
# Edit .env with OPENAI_API_KEY

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Alternative: Run via Python directly
python -m app.main
```

### Docker
```bash
# Run with docker-compose (includes Redis)
docker-compose up

# The service will be available at http://localhost:8093
```

### Testing
```bash
# Test session functionality
export OPENAI_API_KEY=your_key
export REDIS_URL=redis://localhost:6379  # Optional
python test_sessions.py
```

## Architecture

### Core Pattern: Stateless Sessions with Redis History

This agent follows a **stateless session pattern** where:
1. Each HTTP request creates a **fresh AgentSession** object
2. Sessions are identified by `session_id` (conversation ID)
3. `RedisHistoryProvider` automatically loads conversation history from Redis when the session is created
4. No in-memory session caching is needed or used

**Critical Insight:** The `session_id` is what matters, not the session object itself. Creating a new `AgentSession` with the same `session_id` will load the existing conversation history from Redis.

See [SESSION_PATTERN.md](SESSION_PATTERN.md) for detailed documentation on how this works.

### Component Flow

```
FastAPI Request → main.py
    ↓
1. verify_token() - Bearer auth
2. set_session_attributes() - Store JWT in ContextVar
3. get_or_create_session() - Create fresh AgentSession
    ↓
agent.run(message, session=session)
    ↓
4. RedisHistoryProvider.before_run() - Load history from Redis
5. Agent processes with full context
6. Tools execute (can access JWT via get_session_attributes())
7. RedisHistoryProvider.after_run() - Save updated history
```

### Key Files

- **[app/main.py](app/main.py)** - FastAPI routes, authentication, session management
- **[app/agent.py](app/agent.py)** - Agent definition, tool loading, RedisHistoryProvider setup
- **[app/request_context.py](app/request_context.py)** - ContextVar-based session attributes for tools
- **[configs/agent_config.yml](configs/agent_config.yml)** - Agent configuration (name, instructions, tools)
- **[app/tools/](app/tools/)** - Tool implementations (auto-imported via `__init__.py`)
- **[app/tools/utils.py](app/tools/utils.py)** - Tool loading and validation logic

### Tool System

Tools are **auto-discovered** from `app/tools/` folder:
1. `app/tools/__init__.py` auto-imports all functions from Python files (except `utils.py`)
2. `configs/agent_config.yml` specifies which tools to enable
3. `app/tools/utils.py` validates that requested tools exist and loads them
4. Tools access authentication context via `get_session_attributes()["jwt_token"]`

**To add a new tool:**
1. Create `app/tools/my_tool.py` with a function
2. Add `my_tool` to the `tools:` list in `configs/agent_config.yml`
3. Restart the server - the tool will be auto-imported and validated

### Authentication Context Flow

The agent receives a JWT token from the Agent Router and makes it available to tools:

1. **Router sends:** `Authorization: Bearer <token>` + optional `metadata.session_attributes.jwt_token`
2. **main.py extracts:** Token from header and/or request metadata
3. **request_context.py stores:** Token in ContextVar (async-safe) and thread-local (sync tools)
4. **Tools access:** Call `get_session_attributes()["jwt_token"]` to get the token

This allows tools to authenticate with downstream services (e.g., Microsoft Graph API) on behalf of the user.

## Configuration

### Required Environment Variables
```bash
OPENAI_API_KEY=your-key        # Required: OpenAI API key
OPENAI_MODEL_ID=gpt-4o         # Optional: defaults to gpt-4o
OPENAI_BASE_URL=               # Optional: for custom OpenAI endpoints
```

### Optional Environment Variables
```bash
REDIS_URL=redis://localhost:6379  # Optional: enables persistent sessions
AGENT_API_TOKEN=secret-token      # Optional: enables Bearer token auth
CORS_ORIGINS=*                     # Optional: defaults to *
HOST=0.0.0.0                       # Optional: server host
PORT=8000                          # Optional: server port
```

### Redis Behavior

- **With `REDIS_URL` set:** Conversation history persists across requests and server restarts. Sessions can be shared across multiple server instances.
- **Without `REDIS_URL`:** In-memory history only. Each new session starts fresh. History is lost on server restart.

## API Endpoints

### Core Chat Endpoints
- `POST /v1/chat` - Simple chat (returns full response)
- `POST /v1/chat/stream` - Streaming chat (Server-Sent Events)

Request format:
```json
{
  "message": "Hello!",
  "conversation_id": "optional-conv-id",
  "session_attributes": {
    "jwt_token": "optional-user-token"
  }
}
```

### Management Endpoints
- `GET /health` - Health check with agent info
- `POST /v1/conversations` - Create/get conversation (Router compatibility)
- `GET /conversations/{conversation_id}` - Get conversation info
- `DELETE /conversations/{conversation_id}` - Delete conversation

## Important Patterns

### Session Management Anti-Pattern

**❌ DO NOT cache sessions in memory:**
```python
# BAD: Don't do this
_sessions = {}
if conv_id in _sessions:
    return _sessions[conv_id]
```

**✅ Always create fresh sessions:**
```python
# GOOD: Always do this
session = agent.create_session(session_id=conversation_id)
# RedisHistoryProvider loads history automatically
```

Caching sessions causes memory leaks, breaks horizontal scaling, and conflicts with RedisHistoryProvider.

### Multi-turn Conversations

In a FastAPI service, sessions span multiple HTTP requests:

```python
# Request 1
session = agent.create_session(session_id=None)  # Generates new ID
result = await agent.run("My name is Alice", session=session)
# Returns conversation_id to client

# Request 2 (different HTTP request)
session = agent.create_session(session_id="conv_abc123")  # Same ID!
result = await agent.run("What's my name?", session=session)
# RedisHistoryProvider loads "My name is Alice" from Redis
# Agent remembers! ✅
```

### Tool Context Access

Tools need authentication tokens to call external APIs:

```python
from app.request_context import get_session_attributes

def my_tool(param: str) -> str:
    """My tool that calls an external API."""
    attrs = get_session_attributes()
    jwt_token = attrs.get("jwt_token")

    if not jwt_token:
        return "No authentication token available"

    # Use jwt_token to call external API
    response = requests.get(
        "https://api.example.com/data",
        headers={"Authorization": f"Bearer {jwt_token}"}
    )
    return response.json()
```

## Dependencies

This agent depends on packages from the `agent-framework` monorepo:
- `agent-framework` - Core agent framework
- `agent-framework-devui` - DevUI components (executor, mapper)
- `agent-framework-redis` - Redis history provider

These are expected to be installed from a local monorepo (`../agent-framework/`).
