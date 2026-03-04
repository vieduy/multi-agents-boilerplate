# Copyright (c) Microsoft. All rights reserved.
"""Get room availability — delegates to Tool Executor service."""

from app.tool_executor.client import invoke_tool


def get_room_availability(start_time: str, end_time: str) -> dict:
    """
    Get room availability for a specific time period using Microsoft Graph API.
    Executed in tool executor with OAuth2 token from session.
    """
    return invoke_tool(
        "get_room_availability",
        {"start_time": start_time, "end_time": end_time},
    )
