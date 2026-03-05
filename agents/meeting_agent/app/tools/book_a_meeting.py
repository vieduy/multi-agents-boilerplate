"""Book a meeting — delegates to Tool Executor service (Google Calendar)."""

from app.tool_executor.client import invoke_tool


def book_a_meeting(
    summary: str,
    start_time: str,
    end_time: str,
    description: str = "",
    location: str = "",
    attendee_emails: list[str] | None = None,
) -> dict:
    """
    Create a calendar event on Google Calendar.
    Executed in tool executor with OAuth2 token from session.

    Args:
        summary: Event title/subject.
        start_time: Start time in ISO 8601 format (e.g. 2024-03-05T14:00:00+07:00).
        end_time: End time in ISO 8601 format.
        description: Optional event description.
        location: Optional event location.
        attendee_emails: Optional list of attendee email addresses.
    """
    return invoke_tool(
        "book_a_meeting",
        {
            "summary": summary,
            "start_time": start_time,
            "end_time": end_time,
            "description": description,
            "location": location,
            "attendee_emails": attendee_emails or [],
        },
    )
