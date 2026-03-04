# My FastAPI Agent

A FastAPI-based agent using `agent-framework` and `agent-framework-devui` core components.
Built with **standard JWT Bearer authentication** and designed to receive requests from the **Agent Router**.

## Project Structure

```
my_fastapi_agent/
├── app/
│   ├── __init__.py
│   ├── agent.py            # Agent definition
│   ├── main.py             # FastAPI app (auth + routes)
│   └── request_context.py  # Request-scoped session context for tools
├── configs/
│   └── agent_config.yml    # Agent configuration
├── .env.example            # Environment variable template
├── requirements.txt
└── README.md
```

## Key Components

| Component | Module | Purpose |
|---|---|---|
| `AgentFrameworkExecutor` | `agent_framework_devui._executor` | Executes agents and maps events to OpenAI format |
| `EntityDiscovery` | `agent_framework_devui._discovery` | Registry for agent objects |
| `MessageMapper` | `agent_framework_devui._mapper` | Converts framework events to OpenAI SSE events |
| `RedisConversationStore` | `app.redis_store` | Redis-backed conversation history (optional) |
| `RedisHistoryProvider` | `agent_framework.redis` | **NEW:** Built-in session history management |
| `AgentFrameworkRequest` | `agent_framework_devui.models` | OpenAI-compatible request model |

## ✨ Recent Updates: Session History Support

The agent now includes built-in session management using `RedisHistoryProvider`:

### Features
- ✅ **Session-based conversations** - Agent remembers context across turns
- ✅ **Optional Redis persistence** - Conversations persist across restarts (when `REDIS_URL` is set)
- ✅ **Session serialization** - Save/restore sessions from your own database
- ✅ **Backward compatible** - All existing DevUI routes work unchanged

### Quick Start with Sessions

```python
from app.agent import agent

# Create a session
session = agent.create_session(session_id="user_123")

# Have a conversation
response1 = await agent.run("My name is Alice", session=session)
response2 = await agent.run("What's my name?", session=session)
# Agent remembers "Alice"

# Serialize session for storage
serialized = session.to_dict()
# Later: restored = AgentSession.from_dict(serialized)
```

### Configuration

Add to your `.env`:
```bash
REDIS_URL=redis://localhost:6379  # Optional: for persistent sessions
```

- **With Redis:** Conversations persist across app restarts
- **Without Redis:** Uses in-memory history (works but doesn't persist)

### Testing

Run the included test script:
```bash
export OPENAI_API_KEY=your_key
export REDIS_URL=redis://localhost:6379  # Optional
python3 test_sessions.py
```

See [REFACTORING_NOTES.md](REFACTORING_NOTES.md) for detailed implementation notes.

## Self-Contained Tool Execution

This agent is **fully self-contained**. Unlike traditional agent-framework examples, it does **not** require a separate `tool-executor` microservice. All tool logic (Microsoft Graph API integration) is implemented directly within the agent service.

### How it works

1.  **Direct Execution**: When the agent calls a tool (e.g. `book_a_meeting`), the logic is executed locally via `app/tool_executor/handlers.py`.
2.  **Shared Authentication**: The agent uses the `jwt_token` passed by the Agent Router to authenticate with Microsoft Graph API.
3.  **Local Context**: Request-scoped authentication context is managed via `ContextVar` in `app/request_context.py`.

## Setup

```bash
cp .env.example .env
# Edit .env with your OPENAI_API_KEY and AGENT_API_TOKEN

pip install -r requirements.txt
```

## Running

```bash
cd my_fastapi_agent
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Agent Router Integration

The agent expects requests at `POST /v1/responses` with a Bearer token:

```bash
curl -X POST http://localhost:8000/v1/responses \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "my-fastapi-agent",
    "input": [{"role": "user", "content": [{"type": "input_text", "text": "Hello!"}]}],
    "stream": true,
    "metadata": {
      "entity_id": "my-fastapi-agent",
      "session_attributes": {
        "jwt_token": "<user-jwt-token>"
      }
    }
  }'
```

### How the JWT flows

1. **Agent Router** sends `Authorization: Bearer <token>` header.
2. `verify_token` in `main.py` validates the token.
3. `session_attrs["jwt_token"]` is set from `request.metadata.session_attributes` (or from the header as fallback).
4. `set_session_attributes(session_attrs)` stores this in a `ContextVar`.
5. Your **tools** call `get_session_attributes()["jwt_token"]` to forward it to downstream services.

## Authentication

Set `AGENT_API_TOKEN` in `.env` to enable token validation.
Leave it empty to disable auth (development only).

For production, replace the static token check in `verify_token()` with a proper JWT library:
```python
from jose import jwt
payload = jwt.decode(credentials.credentials, PUBLIC_KEY, algorithms=["RS256"])
```
