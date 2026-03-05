"""Get list of meetings — delegates to Tool Executor service (Google Calendar)."""

from app.tool_executor.client import invoke_tool


def get_list_meeting(
    start_datetime: str,
    end_datetime: str,
    limit: int = 10,
) -> list:
    """
    Get a list of calendar events from Google Calendar.
    Executed in tool executor with OAuth2 token from session.

    Args:
        start_datetime: Start of time range in ISO 8601 format.
        end_datetime: End of time range in ISO 8601 format.
        limit: Maximum number of events to return.
    """
    return invoke_tool(
        "get_list_meeting",
        {
            "start_datetime": start_datetime,
            "end_datetime": end_datetime,
            "limit": limit,
        },
    )
