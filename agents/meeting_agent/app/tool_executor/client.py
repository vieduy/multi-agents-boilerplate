# Copyright (c) Microsoft. All rights reserved.
"""HTTP client for the independent Tool Executor service. Requires TOOL_EXECUTOR_URL."""

import base64
import json
import os
import urllib.request
import logging
from typing import Any

from app.request_context import get_session_attributes

logger = logging.getLogger(__name__)

TOOL_EXECUTOR_URL = os.environ.get("TOOL_EXECUTOR_URL", "").rstrip("/")


def decode_jwt_payload(token: str) -> dict[str, Any] | None:
    """
    Decode JWT token payload without verification.
    Returns the decoded payload dictionary or None if decoding fails.
    """
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return None
        
        # Decode the payload (second part)
        payload = parts[1]
        # Add padding if needed
        rem = len(payload) % 4
        if rem:
            payload += "=" * (4 - rem)
        
        decoded = base64.urlsafe_b64decode(payload)
        data = json.loads(decoded.decode("utf-8"))
        return data
    except Exception:
        return None


def invoke_tool(tool_name: str, arguments: dict[str, Any]) -> Any:
    """
    Invoke a tool on the Tool Executor service (POST /invoke).
    Requires TOOL_EXECUTOR_URL. Session attributes come from request context.
    """
    if not TOOL_EXECUTOR_URL:
        return {
            "error": "Tool Executor service not configured. Set TOOL_EXECUTOR_URL (e.g. http://tool-execution-service:8091).",
            "authorized": False,
        }

    session_attrs = get_session_attributes()
    logger.debug(f"session_attrs: {session_attrs}")
    
    # Check for JWT token
    jwt_token = session_attrs.get("jwt_token") or session_attrs.get("oauth_token")
    if not jwt_token:
        # Fallback to env for local development
        jwt_token = os.environ.get("AGENT_API_TOKEN", "")
    
    # Decode JWT token and extract auth attributes
    auth_attributes = {}
    if jwt_token:
        decoded_payload = decode_jwt_payload(jwt_token)
        logger.debug(f"decoded_payload: {decoded_payload}")
        if decoded_payload:
            # Extract auth attributes from JWT payload
            auth_attributes = {
                "sub": decoded_payload.get("sub"),
                "user_id": decoded_payload.get("user_id") or decoded_payload.get("sub"),
            }
    else:
        # No JWT token, return error
        return {
            "error": "No JWT token found in session attributes",
            "authorized": False,
        }
    
    # Build clean session attributes (only user_id, no tokens)
    clean_session_attrs = {"user_id": auth_attributes.get("user_id")}

    event = {
        "sessionAttributes": clean_session_attrs,
        "auth": auth_attributes,  # Pass decoded auth attributes
        "tool_name": tool_name,
        "arguments": arguments,
    }

    # API paths to try
    api_paths = [
        f"{TOOL_EXECUTOR_URL}/api/v1/invoke",
        f"{TOOL_EXECUTOR_URL}/invoke",  # Legacy
    ]
    
    last_error = None
    for api_path in api_paths:
        try:
            req = urllib.request.Request(
                api_path,
                data=json.dumps(event).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = resp.read().decode("utf-8")
                result = json.loads(body)
                # If result is a dict with "result" key, extract it
                if isinstance(result, dict) and "result" in result:
                    return result["result"]
                return result
        except urllib.error.HTTPError as e:
            last_error = e
            if e.code == 404 and api_path == api_paths[0]:
                continue
            try:
                err_body = e.read().decode("utf-8")
                return json.loads(err_body)
            except Exception:
                return {"error": str(e), "status": e.code}
        except OSError as e:
            last_error = e
            if api_path == api_paths[-1]:
                return {"error": f"Tool Execution Service unreachable: {e!s}", "authorized": False}
            continue
    
    if last_error:
        return {"error": f"Tool Execution Service error: {last_error!s}", "authorized": False}
