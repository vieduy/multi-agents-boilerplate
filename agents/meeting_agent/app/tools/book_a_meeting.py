# Copyright (c) Microsoft. All rights reserved.
"""Book a meeting — delegates to Tool Executor service."""

from app.tool_executor.client import invoke_tool


def book_a_meeting(
    room_email: str,
    start_time: str,
    end_time: str,
    subject: str = "Meeting",
    body: str = "Meeting scheduled",
    attendee_emails: list[str] | None = None,
) -> dict:
    """
    Book a meeting in a specific room using Microsoft Graph API.
    Executed in tool executor with OAuth2 token from session.
    """
    return invoke_tool(
        "book_a_meeting",
        {
            "room_email": room_email,
            "start_time": start_time,
            "end_time": end_time,
            "subject": subject,
            "body": body,
            "attendee_emails": attendee_emails or [],
        },
    )
