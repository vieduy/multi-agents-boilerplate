# Copyright (c) Microsoft. All rights reserved.
"""Get list of meetings — delegates to Tool Executor service."""

from app.tool_executor.client import invoke_tool


def get_list_meeting(
    start_datetime: str,
    end_datetime: str,
    limit: int = 5,
) -> list:
    """
    Get a list of calendar events from Outlook.
    Executed in tool executor with OAuth2 token from session.
    """
    return invoke_tool(
        "get_list_meeting",
        {
            "start_datetime": start_datetime,
            "end_datetime": end_datetime,
            "limit": limit,
        },
    )
