"""Check calendar free/busy status — delegates to Tool Executor service (Google Calendar)."""

from app.tool_executor.client import invoke_tool


def get_room_availability(
    start_time: str,
    end_time: str,
    calendar_ids: list[str] | None = None,
) -> dict:
    """
    Check free/busy status for one or more Google Calendars.
    Executed in tool executor with OAuth2 token from session.

    Args:
        start_time: Start of query window in ISO 8601 format.
        end_time: End of query window in ISO 8601 format.
        calendar_ids: Optional list of calendar IDs to check. Defaults to primary calendar.
    """
    return invoke_tool(
        "get_room_availability",
        {
            "start_time": start_time,
            "end_time": end_time,
            "calendar_ids": calendar_ids or [],
        },
    )
