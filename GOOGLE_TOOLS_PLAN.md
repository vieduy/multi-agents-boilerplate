# Google Tools Implementation Plan

## Overview
Add Google Calendar and Gmail integration to the multi-agent system with OAuth2 authentication.

---

## Google Tools to Implement

### 1. Google Calendar Tools

#### Tool: `google_create_event`
**Purpose**: Create calendar events in Google Calendar

**Scopes Required**:
- `https://www.googleapis.com/auth/calendar.events`

**Arguments**:
```python
{
    "summary": str,           # Event title
    "start_time": str,        # ISO format: 2024-03-05T10:00:00
    "end_time": str,          # ISO format: 2024-03-05T11:00:00
    "description": str,       # Optional event description
    "location": str,          # Optional location
    "attendees": list[str]    # Optional list of email addresses
}
```

**API**: Google Calendar API v3 - `events.insert`

---

#### Tool: `google_list_events`
**Purpose**: List upcoming calendar events

**Scopes Required**:
- `https://www.googleapis.com/auth/calendar.readonly`

**Arguments**:
```python
{
    "start_time": str,    # ISO format
    "end_time": str,      # ISO format
    "max_results": int,   # Default: 10
    "calendar_id": str    # Default: "primary"
}
```

**API**: Google Calendar API v3 - `events.list`

---

#### Tool: `google_get_event`
**Purpose**: Get details of a specific calendar event

**Scopes Required**:
- `https://www.googleapis.com/auth/calendar.readonly`

**Arguments**:
```python
{
    "event_id": str,
    "calendar_id": str  # Default: "primary"
}
```

**API**: Google Calendar API v3 - `events.get`

---

#### Tool: `google_delete_event`
**Purpose**: Delete a calendar event

**Scopes Required**:
- `https://www.googleapis.com/auth/calendar.events`

**Arguments**:
```python
{
    "event_id": str,
    "calendar_id": str  # Default: "primary"
}
```

**API**: Google Calendar API v3 - `events.delete`

---

### 2. Google Gmail Tools

#### Tool: `google_send_email`
**Purpose**: Send an email via Gmail

**Scopes Required**:
- `https://www.googleapis.com/auth/gmail.send`

**Arguments**:
```python
{
    "to": str,              # Recipient email
    "subject": str,         # Email subject
    "body": str,            # Email body (plain text or HTML)
    "cc": list[str],        # Optional CC recipients
    "bcc": list[str],       # Optional BCC recipients
    "attachments": list     # Optional file attachments (future)
}
```

**API**: Gmail API v1 - `users.messages.send`

---

#### Tool: `google_list_emails`
**Purpose**: List emails from Gmail inbox

**Scopes Required**:
- `https://www.googleapis.com/auth/gmail.readonly`

**Arguments**:
```python
{
    "query": str,         # Gmail search query (e.g., "is:unread")
    "max_results": int,   # Default: 10
    "label_ids": list[str]  # Optional label filters
}
```

**API**: Gmail API v1 - `users.messages.list`

---

#### Tool: `google_get_email`
**Purpose**: Get details of a specific email

**Scopes Required**:
- `https://www.googleapis.com/auth/gmail.readonly`

**Arguments**:
```python
{
    "message_id": str,
    "format": str  # "full", "metadata", "minimal" - default: "full"
}
```

**API**: Gmail API v1 - `users.messages.get`

---

#### Tool: `google_search_emails`
**Purpose**: Search emails with advanced queries

**Scopes Required**:
- `https://www.googleapis.com/auth/gmail.readonly`

**Arguments**:
```python
{
    "query": str,         # Gmail search syntax
    "max_results": int,   # Default: 10
    "include_body": bool  # Default: false
}
```

**API**: Gmail API v1 - `users.messages.list` + `users.messages.get`

---

## Tool Permissions Registry

```python
TOOL_PERMISSIONS = {
    # ... existing Microsoft tools ...

    # Google Calendar Tools
    "google_create_event": {
        "provider": "google",
        "secret_key": "google_calendar_write",
        "scopes": [
            "https://www.googleapis.com/auth/calendar.events"
        ],
        "display_name": "Google Calendar Events",
        "description": "Create and manage Google Calendar events",
        "icon": "📅"
    },
    "google_list_events": {
        "provider": "google",
        "secret_key": "google_calendar_read",
        "scopes": [
            "https://www.googleapis.com/auth/calendar.readonly"
        ],
        "display_name": "Google Calendar Read",
        "description": "View your Google Calendar events",
        "icon": "📆"
    },
    "google_get_event": {
        "provider": "google",
        "secret_key": "google_calendar_read",
        "scopes": [
            "https://www.googleapis.com/auth/calendar.readonly"
        ],
        "display_name": "Google Calendar Read",
        "description": "View your Google Calendar events",
        "icon": "📆"
    },
    "google_delete_event": {
        "provider": "google",
        "secret_key": "google_calendar_write",
        "scopes": [
            "https://www.googleapis.com/auth/calendar.events"
        ],
        "display_name": "Google Calendar Events",
        "description": "Create and manage Google Calendar events",
        "icon": "📅"
    },

    # Google Gmail Tools
    "google_send_email": {
        "provider": "google",
        "secret_key": "google_gmail_send",
        "scopes": [
            "https://www.googleapis.com/auth/gmail.send"
        ],
        "display_name": "Gmail Send",
        "description": "Send emails via Gmail",
        "icon": "📧"
    },
    "google_list_emails": {
        "provider": "google",
        "secret_key": "google_gmail_read",
        "scopes": [
            "https://www.googleapis.com/auth/gmail.readonly"
        ],
        "display_name": "Gmail Read",
        "description": "Read your Gmail messages",
        "icon": "📬"
    },
    "google_get_email": {
        "provider": "google",
        "secret_key": "google_gmail_read",
        "scopes": [
            "https://www.googleapis.com/auth/gmail.readonly"
        ],
        "display_name": "Gmail Read",
        "description": "Read your Gmail messages",
        "icon": "📬"
    },
    "google_search_emails": {
        "provider": "google",
        "secret_key": "google_gmail_read",
        "scopes": [
            "https://www.googleapis.com/auth/gmail.readonly"
        ],
        "display_name": "Gmail Read",
        "description": "Read your Gmail messages",
        "icon": "📬"
    }
}
```

---

## Google OAuth2 Configuration

### OAuth2 Endpoints
- **Authorization**: `https://accounts.google.com/o/oauth2/v2/auth`
- **Token**: `https://oauth2.googleapis.com/token`
- **Token Info**: `https://oauth2.googleapis.com/tokeninfo`
- **Revoke**: `https://oauth2.googleapis.com/revoke`

### Required Environment Variables
```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Google Cloud Console Setup

1. **Create Project**: Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Enable APIs**:
   - Google Calendar API
   - Gmail API
3. **Create OAuth Credentials**:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/oauth/callback`
4. **Download credentials** (client_id and client_secret)

---

## Implementation Files

### 1. Secrets Manager Updates

**File**: `secrets-manager/app/services/oauth_service.py`

Add Google OAuth2 methods:
```python
def __init__(self, storage: SecretsStorage):
    # ... existing Microsoft config ...

    # Google OAuth2 configuration
    self.google_config = {
        "client_id": getattr(settings, "GOOGLE_CLIENT_ID", ""),
        "client_secret": getattr(settings, "GOOGLE_CLIENT_SECRET", ""),
        "auth_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_endpoint": "https://oauth2.googleapis.com/token",
        "scope_separator": " "
    }

async def _exchange_google_code(self, code: str, redirect_uri: str) -> dict:
    """Exchange Google authorization code for tokens."""
    # Implementation

async def _refresh_google_token(self, refresh_token: str) -> dict:
    """Refresh Google access token."""
    # Implementation
```

**File**: `secrets-manager/app/core/config.py`

Add Google settings:
```python
# Google OAuth2 Configuration
GOOGLE_CLIENT_ID: Optional[str] = None
GOOGLE_CLIENT_SECRET: Optional[str] = None
```

---

### 2. Tool Executor - Google API Client

**File**: `tool-executor/app/utils/google_client.py` (NEW)

```python
"""Google API client for Calendar and Gmail."""

class GoogleAPIClient:
    """Client for Google APIs (Calendar, Gmail)."""

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://www.googleapis.com"

    # Calendar methods
    def create_calendar_event(self, event_data: dict) -> dict:
        """Create a Google Calendar event."""

    def list_calendar_events(self, start_time: str, end_time: str, ...) -> list:
        """List Google Calendar events."""

    def get_calendar_event(self, event_id: str, calendar_id: str) -> dict:
        """Get a specific calendar event."""

    def delete_calendar_event(self, event_id: str, calendar_id: str) -> dict:
        """Delete a calendar event."""

    # Gmail methods
    def send_email(self, to: str, subject: str, body: str, ...) -> dict:
        """Send an email via Gmail."""

    def list_emails(self, query: str, max_results: int) -> list:
        """List emails from Gmail."""

    def get_email(self, message_id: str, format: str) -> dict:
        """Get a specific email."""

    def search_emails(self, query: str, max_results: int) -> list:
        """Search emails."""
```

---

### 3. Tool Executor - Google Tool Handlers

**File**: `tool-executor/app/utils/handlers/google_handlers.py` (NEW)

```python
"""Google tool handlers (Calendar & Gmail)."""

from app.utils.auth import with_oauth2_token
from app.utils.context import ToolExecutorContext
from app.utils.decorators import log_tool_call
from app.utils.google_client import GoogleAPIClient
from app.utils.registry import ToolRegistry


# ============================================
# Google Calendar Tools
# ============================================

@ToolRegistry.register("google_create_event")
@log_tool_call
@with_oauth2_token(secret_key="google_calendar_write")
def handle_google_create_event(context: ToolExecutorContext) -> dict:
    """Create a Google Calendar event."""
    # Implementation

@ToolRegistry.register("google_list_events")
@log_tool_call
@with_oauth2_token(secret_key="google_calendar_read")
def handle_google_list_events(context: ToolExecutorContext) -> dict:
    """List Google Calendar events."""
    # Implementation

# ... more calendar handlers ...


# ============================================
# Google Gmail Tools
# ============================================

@ToolRegistry.register("google_send_email")
@log_tool_call
@with_oauth2_token(secret_key="google_gmail_send")
def handle_google_send_email(context: ToolExecutorContext) -> dict:
    """Send an email via Gmail."""
    # Implementation

@ToolRegistry.register("google_list_emails")
@log_tool_call
@with_oauth2_token(secret_key="google_gmail_read")
def handle_google_list_emails(context: ToolExecutorContext) -> dict:
    """List Gmail emails."""
    # Implementation

# ... more gmail handlers ...
```

---

### 4. Update Permissions Registry

**File**: `tool-executor/app/utils/permissions.py`

Add Google tool permissions (shown above in "Tool Permissions Registry")

---

## API Examples

### Google Calendar API

**Create Event**:
```http
POST https://www.googleapis.com/calendar/v3/calendars/primary/events
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "summary": "Team Meeting",
  "start": {
    "dateTime": "2024-03-05T10:00:00-07:00",
    "timeZone": "America/Los_Angeles"
  },
  "end": {
    "dateTime": "2024-03-05T11:00:00-07:00",
    "timeZone": "America/Los_Angeles"
  },
  "attendees": [
    {"email": "user@example.com"}
  ]
}
```

**List Events**:
```http
GET https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=2024-03-05T00:00:00Z&timeMax=2024-03-06T00:00:00Z&maxResults=10
Authorization: Bearer {access_token}
```

---

### Gmail API

**Send Email**:
```http
POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "raw": "base64_encoded_email_message"
}
```

**List Emails**:
```http
GET https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=10
Authorization: Bearer {access_token}
```

---

## Environment Configuration

**`.env`**:
```bash
# Google OAuth2
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**`docker-compose.yml`**:
```yaml
secrets-manager:
  environment:
    - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
    - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}
```

---

## Testing

### Test Google OAuth Flow

```bash
# 1. Generate authorization URL
curl -X POST http://localhost:8092/api/v1/oauth/google/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "secret_key": "google_calendar_read",
    "scopes": ["https://www.googleapis.com/auth/calendar.readonly"],
    "redirect_uri": "http://localhost:3000/oauth/callback",
    "provider": "google"
  }'

# 2. Open auth_url in browser, authorize

# 3. Exchange code for tokens
curl -X POST http://localhost:8092/api/v1/oauth/google/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "authorization_code_from_google",
    "state": "encrypted_state",
    "redirect_uri": "http://localhost:3000/oauth/callback",
    "provider": "google"
  }'
```

### Test Google Tools

```bash
# Create calendar event
curl -X POST http://localhost:8090/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "google_create_event",
    "arguments": {
      "summary": "Test Event",
      "start_time": "2024-03-05T10:00:00",
      "end_time": "2024-03-05T11:00:00"
    },
    "sessionAttributes": {
      "user_id": "test-user"
    }
  }'

# Send email
curl -X POST http://localhost:8090/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "google_send_email",
    "arguments": {
      "to": "recipient@example.com",
      "subject": "Test Email",
      "body": "Hello from the agent!"
    },
    "sessionAttributes": {
      "user_id": "test-user"
    }
  }'
```

---

## Implementation Checklist

- [ ] Update `oauth_service.py` with Google OAuth2 methods
- [ ] Add Google config to `secrets-manager/app/core/config.py`
- [ ] Create `google_client.py` with Google API methods
- [ ] Create `google_handlers.py` with tool implementations
- [ ] Update `permissions.py` with Google tool permissions
- [ ] Update `docker-compose.yml` with Google env vars
- [ ] Update `.env.example` with Google credentials
- [ ] Create documentation and examples
- [ ] Test OAuth flow end-to-end
- [ ] Test each tool individually

---

## Benefits

1. **Multi-Provider**: Users can choose Microsoft or Google for calendar/email
2. **Consistent UX**: Same permission flow as Microsoft tools
3. **Extensible**: Easy to add more Google services (Drive, Docs, etc.)
4. **Secure**: OAuth2 with auto-refresh tokens
5. **User-Friendly**: Clear permission requests per service

---

## Future Enhancements

- Google Drive tools (upload, search, share files)
- Google Docs tools (create, edit documents)
- Google Sheets tools (read, write spreadsheets)
- Google Meet tools (create meetings)
- Cross-provider tools (sync Microsoft ↔ Google calendars)
