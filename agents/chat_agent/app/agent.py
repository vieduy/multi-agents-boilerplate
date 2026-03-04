"""Agent definition for my FastAPI agent — mapped from room_agent."""

import os
from datetime import datetime
from pathlib import Path
import logging

import yaml
from agent_framework import Agent
from agent_framework.openai import OpenAIChatClient

from .tools.utils import load_tools_from_config
import app.tools as tools_module

# Import Redis history provider for conversation persistence
try:
    from agent_framework.redis import RedisHistoryProvider
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    print("Warning: agent_framework.redis not available. Session history will use in-memory storage only.")

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Load configuration
# ---------------------------------------------------------------------------

config_path = Path(__file__).parent.parent / "configs" / "agent_config.yml"
try:
    with open(config_path) as f:
        config = yaml.safe_load(f) or {}
except Exception as e:
    print(f"Warning: Could not load config from {config_path}: {e}")
    config = {}

# ---------------------------------------------------------------------------
# Load and validate tools from config
# ---------------------------------------------------------------------------

tools, TOOL_MAP = load_tools_from_config(config, tools_module)

# ---------------------------------------------------------------------------
# Build agent
# ---------------------------------------------------------------------------

instructions = config.get("instructions", "You are a helpful assistant.").format(
    current_date=datetime.now().strftime("%Y-%m-%d")
)

chat_client = OpenAIChatClient(
    api_key=os.environ.get("OPENAI_API_KEY", ""),
    model_id=os.environ.get("OPENAI_MODEL_ID", "gpt-4o"),
    base_url=os.environ.get("OPENAI_BASE_URL") or None,
)

# ---------------------------------------------------------------------------
# Setup context providers for conversation history
# ---------------------------------------------------------------------------

context_providers = []

# Add Redis history provider if Redis URL is configured
redis_url = os.environ.get("REDIS_URL")
if redis_url and REDIS_AVAILABLE:
    logger.info(f"Configuring RedisHistoryProvider with URL: {redis_url}")
    redis_provider = RedisHistoryProvider(
        source_id="qa_agent_history",
        redis_url=redis_url,
        max_messages=100,  # Optional: limit context window size
    )
    context_providers.append(redis_provider)
    logger.info("✅ RedisHistoryProvider enabled - conversation history will persist")
else:
    if not redis_url:
        logger.info("ℹ️  No REDIS_URL configured - using in-memory history (sessions will not persist)")
    elif not REDIS_AVAILABLE:
        logger.warning("⚠️  REDIS_URL set but agent_framework.redis not available - using in-memory history")

# ---------------------------------------------------------------------------
# Create agent with context providers
# ---------------------------------------------------------------------------

agent = Agent(
    name=config.get("name", "Chat Agent"),
    description=config.get("description", "An agent specialized in Chat"),
    instructions=instructions,
    client=chat_client,
    tools=tools,
    context_providers=context_providers,  # Enable session-based conversation history
)
