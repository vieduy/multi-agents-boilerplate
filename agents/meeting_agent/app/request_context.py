"""Request-scoped session attributes for passing auth context from router to tools."""

import logging
import threading
from contextvars import ContextVar
from typing import Any

logger = logging.getLogger(__name__)

# ContextVar for async context (FastAPI async handlers)
request_session_attributes: ContextVar[dict[str, Any]] = ContextVar(
    "request_session_attributes", default={}
)

# Thread-local for synchronous tool execution in threads
_thread_local = threading.local()


def set_session_attributes(attrs: dict[str, Any] | None) -> None:
    """Set session attributes for the current request.

    Call this before executing the agent so tools can access the auth context.
    Works for both async (ContextVar) and thread-based (thread-local) execution.
    """
    attrs = attrs or {}
    try:
        request_session_attributes.set(attrs)
        logger.debug(f"set_session_attributes() via ContextVar: {list(attrs.keys())}")
    except Exception as e:
        logger.warning(f"Failed to set ContextVar: {e}")

    try:
        _thread_local.session_attributes = attrs
    except Exception as e:
        logger.warning(f"Failed to set thread-local: {e}")


def get_session_attributes() -> dict[str, Any]:
    """Get session attributes for the current request.

    Used by tools to retrieve the JWT token and other auth context
    forwarded by the Agent Router.
    """
    try:
        attrs = request_session_attributes.get()
        if attrs:
            return attrs.copy()
    except LookupError:
        pass

    attrs = getattr(_thread_local, "session_attributes", {})
    if attrs:
        return attrs.copy()

    return {}
