# OAuth2 Permission Flow Implementation Plan

## Overview
This document outlines the plan to implement OAuth2 permission management with automatic consent flow when users haven't granted tool permissions. The system will handle token storage, refresh, and redirect users to grant permissions when needed.

---

## Current Architecture Analysis

### Existing Components

1. **Tool Executor** ([tool-executor/](tool-executor/))
   - Executes tools with OAuth2 tokens
   - Uses `@with_oauth2_token(secret_key="oauth2_token")` decorator
   - Currently fetches tokens from Secrets Manager via `GET /api/v1/secrets/{user_id}/{key}`
   - Returns `UnauthorizedError` when token is missing

2. **Secrets Manager** ([secrets-manager/](secrets-manager/))
   - Stores encrypted secrets in MongoDB
   - Current endpoints:
     - `POST /api/v1/secrets/{key}` - Create/update secret
     - `GET /api/v1/secrets/{key}` - Get secret
     - `DELETE /api/v1/secrets/{key}` - Delete secret
     - `GET /api/v1/secrets` - List all keys
   - Keys are namespaced: `{user_id}/{secret_key}`

3. **Auth Service** ([auth-service/](auth-service/))
   - Handles user authentication with JWT
   - MongoDB-backed user database

### Current Flow
```
Agent → Tool Executor → @with_oauth2_token → Secrets Manager
                              ↓
                         Returns token or raises UnauthorizedError
```

---

## Proposed Architecture

### 1. Tool Permission Schema

Each tool will define its required permissions:

```python
# tool-executor/app/utils/permissions.py

TOOL_PERMISSIONS = {
    "book_a_meeting": {
        "provider": "microsoft",
        "secret_key": "microsoft_calendar_write",
        "scopes": [
            "Calendars.ReadWrite",
            "Calendars.ReadWrite.Shared",
            "Place.Read.All"
        ],
        "display_name": "Calendar & Room Booking",
        "description": "Access to book meetings and view room availability"
    },
    "get_room_availability": {
        "provider": "microsoft",
        "secret_key": "microsoft_calendar_read",
        "scopes": [
            "Calendars.Read",
            "Calendars.Read.Shared",
            "Place.Read.All"
        ],
        "display_name": "Calendar & Room Reading",
        "description": "Access to view calendar and room availability"
    },
    "get_list_meeting": {
        "provider": "microsoft",
        "secret_key": "microsoft_calendar_read",
        "scopes": [
            "Calendars.Read",
            "Calendars.Read.Shared"
        ],
        "display_name": "Calendar Reading",
        "description": "Access to view your calendar events"
    },
    # Future tools...
    "send_email": {
        "provider": "microsoft",
        "secret_key": "microsoft_mail_send",
        "scopes": ["Mail.Send"],
        "display_name": "Send Email",
        "description": "Send emails on your behalf"
    }
}
```

### 2. Enhanced Secrets Manager

#### New Endpoints

```python
# POST /api/v1/oauth/microsoft/authorize
# Generate OAuth2 authorization URL
{
    "user_id": "string",
    "secret_key": "microsoft_calendar_read",
    "scopes": ["Calendars.Read", "Place.Read.All"],
    "redirect_uri": "http://frontend:3000/oauth/callback",
    "state": "encrypted_session_state"
}
# Response:
{
    "auth_url": "https://login.microsoftonline.com/...",
    "state": "encrypted_session_state"
}

# POST /api/v1/oauth/microsoft/callback
# Exchange authorization code for tokens
{
    "code": "authorization_code",
    "state": "encrypted_session_state",
    "redirect_uri": "http://frontend:3000/oauth/callback"
}
# Response:
{
    "success": true,
    "user_id": "string",
    "secret_key": "microsoft_calendar_read",
    "expires_at": "2024-03-05T12:00:00Z"
}

# GET /api/v1/oauth/status/{user_id}/{secret_key}
# Check if user has granted permission
# Response:
{
    "authorized": true,
    "expires_at": "2024-03-05T12:00:00Z",
    "scopes": ["Calendars.Read", "Place.Read.All"]
}

# POST /api/v1/oauth/refresh/{user_id}/{secret_key}
# Manually trigger token refresh (auto-refresh on get)
```

#### Token Storage Schema

```python
# MongoDB document structure
{
    "_id": ObjectId,
    "key": "user_id/secret_key",  # e.g., "69a8fbde210d39cd2c48bbcb/microsoft_calendar_read"
    "user_id": "69a8fbde210d39cd2c48bbcb",
    "secret_key": "microsoft_calendar_read",
    "provider": "microsoft",
    "value": "encrypted_access_token",
    "refresh_token": "encrypted_refresh_token",  # NEW
    "expires_at": ISODate("2024-03-05T12:00:00Z"),  # NEW
    "scopes": ["Calendars.Read", "Place.Read.All"],  # NEW
    "metadata": {
        "provider_user_id": "microsoft_user_id",
        "email": "user@example.com"
    },
    "created_at": ISODate,
    "updated_at": ISODate,
    "description": "Microsoft Calendar Read Access"
}
```

### 3. Enhanced Tool Executor

#### Modified Auth Decorator

```python
# tool-executor/app/utils/auth.py

def with_oauth2_token(
    secret_key: str = "oauth2_token",
    message_unauthorized: str = MESSAGE_UNAUTHORIZED,
    auto_consent: bool = True,  # NEW: Enable auto-consent flow
):
    """
    Decorator: resolve OAuth2 token from secrets manager.

    If token is missing and auto_consent=True, raises PermissionRequiredError
    with consent URL instead of generic UnauthorizedError.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(context: ToolExecutorContext):
            user_id = context.session_attributes.get("user_id")
            if not user_id:
                raise UnauthorizedError(message_unauthorized)

            sm = get_secrets_manager()
            if not sm:
                raise UnauthorizedError(message_unauthorized)

            # Try to get token (auto-refresh if expired)
            token = sm.get_token(key=secret_key, user_id=str(user_id))

            if not token:
                if auto_consent:
                    # Get tool permission info
                    tool_name = context.tool_name
                    permission = TOOL_PERMISSIONS.get(tool_name, {})

                    # Generate consent URL
                    consent_url = sm.get_consent_url(
                        user_id=user_id,
                        secret_key=secret_key,
                        scopes=permission.get("scopes", []),
                        provider=permission.get("provider", "microsoft")
                    )

                    raise PermissionRequiredError(
                        message=f"Permission required: {permission.get('display_name', secret_key)}",
                        consent_url=consent_url,
                        secret_key=secret_key,
                        scopes=permission.get("scopes", [])
                    )
                else:
                    raise UnauthorizedError(message_unauthorized)

            context.auth_token = token
            return func(context)
        return wrapper
    return decorator
```

#### New Exception Type

```python
# tool-executor/app/core/exceptions.py

class PermissionRequiredError(ToolExecutorException):
    """Raised when user needs to grant OAuth2 permissions."""

    def __init__(
        self,
        message: str,
        consent_url: str,
        secret_key: str,
        scopes: list[str]
    ):
        super().__init__(message)
        self.consent_url = consent_url
        self.secret_key = secret_key
        self.scopes = scopes
```

#### Enhanced Error Response

```python
# tool-executor/app/core/exception_handlers.py

@app.exception_handler(PermissionRequiredError)
async def permission_required_handler(request: Request, exc: PermissionRequiredError):
    return JSONResponse(
        status_code=403,
        content={
            "error": "permission_required",
            "message": exc.message,
            "consent_url": exc.consent_url,
            "secret_key": exc.secret_key,
            "scopes": exc.scopes,
            "action_required": "oauth_consent"
        }
    )
```

### 4. Frontend Flow

#### New OAuth Callback Page

```typescript
// frontend/app/oauth/callback/page.tsx

export default function OAuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      if (error) {
        // Handle OAuth error
        showError(`OAuth failed: ${error}`);
        return;
      }

      if (!code || !state) {
        showError('Invalid OAuth callback');
        return;
      }

      // Exchange code for token via secrets-manager
      const response = await fetch('/api/oauth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          state,
          redirect_uri: window.location.origin + '/oauth/callback'
        })
      });

      if (response.ok) {
        showSuccess('Permission granted successfully!');
        // Close popup or redirect back to chat
        window.opener?.postMessage({ type: 'oauth_success' }, '*');
        window.close();
      } else {
        showError('Failed to complete authorization');
      }
    };

    handleCallback();
  }, []);

  return <div>Processing authorization...</div>;
}
```

#### Enhanced Chat Interface

```typescript
// frontend/components/ChatInterface.tsx

const handleToolError = (error: any) => {
  if (error.action_required === 'oauth_consent') {
    // Show permission request UI
    showPermissionRequest({
      message: error.message,
      consentUrl: error.consent_url,
      secretKey: error.secret_key,
      scopes: error.scopes,
      onAuthorize: () => {
        // Open consent URL in popup
        const popup = window.open(
          error.consent_url,
          'oauth_consent',
          'width=600,height=700'
        );

        // Listen for completion
        window.addEventListener('message', (event) => {
          if (event.data.type === 'oauth_success') {
            popup?.close();
            // Retry the tool call
            retryLastMessage();
          }
        });
      }
    });
  }
};
```

### 5. Secrets Manager - OAuth2 Flow Implementation

#### OAuth2 Service

```python
# secrets-manager/app/services/oauth_service.py

import urllib.parse
from datetime import datetime, timedelta
from typing import Any

import httpx
from cryptography.fernet import Fernet

from app.core.config import settings
from app.services.storage import SecretsStorage


class OAuth2Service:
    """Handle OAuth2 flows for Microsoft and other providers."""

    def __init__(self, storage: SecretsStorage):
        self.storage = storage
        self.cipher = Fernet(settings.SECRETS_ENCRYPTION_KEY.encode())

        # Microsoft OAuth2 config
        self.microsoft_config = {
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "client_secret": settings.MICROSOFT_CLIENT_SECRET,
            "tenant_id": settings.MICROSOFT_TENANT_ID or "common",
            "auth_endpoint": f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID or 'common'}/oauth2/v2.0/authorize",
            "token_endpoint": f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID or 'common'}/oauth2/v2.0/token",
        }

    def generate_auth_url(
        self,
        user_id: str,
        secret_key: str,
        scopes: list[str],
        redirect_uri: str,
        provider: str = "microsoft"
    ) -> dict[str, str]:
        """Generate OAuth2 authorization URL."""

        # Create encrypted state with user info
        state_data = {
            "user_id": user_id,
            "secret_key": secret_key,
            "timestamp": datetime.utcnow().isoformat()
        }
        state = self.cipher.encrypt(str(state_data).encode()).decode()

        if provider == "microsoft":
            params = {
                "client_id": self.microsoft_config["client_id"],
                "response_type": "code",
                "redirect_uri": redirect_uri,
                "scope": " ".join(scopes),
                "state": state,
                "response_mode": "query",
                "prompt": "consent"  # Force consent screen
            }
            auth_url = f"{self.microsoft_config['auth_endpoint']}?{urllib.parse.urlencode(params)}"
            return {"auth_url": auth_url, "state": state}

        raise ValueError(f"Unsupported provider: {provider}")

    async def exchange_code(
        self,
        code: str,
        state: str,
        redirect_uri: str,
        provider: str = "microsoft"
    ) -> dict[str, Any]:
        """Exchange authorization code for access & refresh tokens."""

        # Decrypt and validate state
        try:
            state_data = eval(self.cipher.decrypt(state.encode()).decode())
            user_id = state_data["user_id"]
            secret_key = state_data["secret_key"]
        except Exception:
            raise ValueError("Invalid state parameter")

        if provider == "microsoft":
            # Exchange code for token
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.microsoft_config["token_endpoint"],
                    data={
                        "client_id": self.microsoft_config["client_id"],
                        "client_secret": self.microsoft_config["client_secret"],
                        "code": code,
                        "redirect_uri": redirect_uri,
                        "grant_type": "authorization_code",
                    }
                )
                response.raise_for_status()
                token_data = response.json()

            # Store tokens in secrets manager
            access_token = token_data["access_token"]
            refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 3600)
            scopes = token_data.get("scope", "").split()

            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

            await self.storage.set(
                key=f"{user_id}/{secret_key}",
                value=access_token,
                description=f"Microsoft OAuth2 token for {secret_key}",
                metadata={
                    "refresh_token": refresh_token,
                    "expires_at": expires_at.isoformat(),
                    "scopes": scopes,
                    "provider": provider,
                    "user_id": user_id,
                    "secret_key": secret_key
                }
            )

            return {
                "success": True,
                "user_id": user_id,
                "secret_key": secret_key,
                "expires_at": expires_at.isoformat()
            }

        raise ValueError(f"Unsupported provider: {provider}")

    async def refresh_token(
        self,
        user_id: str,
        secret_key: str,
        provider: str = "microsoft"
    ) -> str | None:
        """Refresh an expired access token."""

        # Get current token data
        secret = await self.storage.get(f"{user_id}/{secret_key}")
        if not secret:
            return None

        metadata = secret.get("metadata", {})
        refresh_token = metadata.get("refresh_token")

        if not refresh_token:
            return None

        if provider == "microsoft":
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.microsoft_config["token_endpoint"],
                    data={
                        "client_id": self.microsoft_config["client_id"],
                        "client_secret": self.microsoft_config["client_secret"],
                        "refresh_token": refresh_token,
                        "grant_type": "refresh_token",
                    }
                )

                if response.status_code != 200:
                    # Refresh token expired, delete secret
                    await self.storage.delete(f"{user_id}/{secret_key}")
                    return None

                token_data = response.json()

            # Update stored token
            access_token = token_data["access_token"]
            new_refresh_token = token_data.get("refresh_token", refresh_token)
            expires_in = token_data.get("expires_in", 3600)
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

            metadata.update({
                "refresh_token": new_refresh_token,
                "expires_at": expires_at.isoformat()
            })

            await self.storage.set(
                key=f"{user_id}/{secret_key}",
                value=access_token,
                metadata=metadata
            )

            return access_token

        return None

    async def get_token_with_refresh(
        self,
        user_id: str,
        secret_key: str,
        provider: str = "microsoft"
    ) -> str | None:
        """Get token, auto-refresh if expired."""

        secret = await self.storage.get(f"{user_id}/{secret_key}")
        if not secret:
            return None

        metadata = secret.get("metadata", {})
        expires_at_str = metadata.get("expires_at")

        if expires_at_str:
            expires_at = datetime.fromisoformat(expires_at_str)
            # Refresh if expiring in next 5 minutes
            if expires_at < datetime.utcnow() + timedelta(minutes=5):
                return await self.refresh_token(user_id, secret_key, provider)

        return secret.get("value")
```

#### New OAuth Endpoints

```python
# secrets-manager/app/api/endpoints/oauth.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_storage
from app.services.oauth_service import OAuth2Service
from app.services.storage import SecretsStorage

router = APIRouter()


class AuthorizeRequest(BaseModel):
    user_id: str
    secret_key: str
    scopes: list[str]
    redirect_uri: str
    provider: str = "microsoft"


class CallbackRequest(BaseModel):
    code: str
    state: str
    redirect_uri: str
    provider: str = "microsoft"


@router.post("/oauth/{provider}/authorize")
async def generate_auth_url(
    provider: str,
    request: AuthorizeRequest,
    storage: SecretsStorage = Depends(get_current_storage)
):
    """Generate OAuth2 authorization URL."""
    oauth_service = OAuth2Service(storage)
    return oauth_service.generate_auth_url(
        user_id=request.user_id,
        secret_key=request.secret_key,
        scopes=request.scopes,
        redirect_uri=request.redirect_uri,
        provider=provider
    )


@router.post("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: CallbackRequest,
    storage: SecretsStorage = Depends(get_current_storage)
):
    """Handle OAuth2 callback and store tokens."""
    oauth_service = OAuth2Service(storage)
    return await oauth_service.exchange_code(
        code=request.code,
        state=request.state,
        redirect_uri=request.redirect_uri,
        provider=provider
    )


@router.get("/oauth/status/{user_id}/{secret_key}")
async def check_oauth_status(
    user_id: str,
    secret_key: str,
    storage: SecretsStorage = Depends(get_current_storage)
):
    """Check if user has authorized the permission."""
    secret = await storage.get(f"{user_id}/{secret_key}")

    if not secret:
        return {"authorized": False}

    metadata = secret.get("metadata", {})
    return {
        "authorized": True,
        "expires_at": metadata.get("expires_at"),
        "scopes": metadata.get("scopes", []),
        "provider": metadata.get("provider")
    }


@router.post("/oauth/refresh/{user_id}/{secret_key}")
async def refresh_oauth_token(
    user_id: str,
    secret_key: str,
    provider: str = "microsoft",
    storage: SecretsStorage = Depends(get_current_storage)
):
    """Manually refresh OAuth2 token."""
    oauth_service = OAuth2Service(storage)
    token = await oauth_service.refresh_token(user_id, secret_key, provider)

    if not token:
        raise HTTPException(status_code=404, detail="Token not found or refresh failed")

    return {"success": True, "message": "Token refreshed successfully"}
```

---

## Implementation Steps

### Phase 1: Secrets Manager Enhancement (Week 1)

1. **Update MongoDB Schema**
   - Add `refresh_token`, `expires_at`, `scopes` fields to secrets
   - Create migration script for existing secrets

2. **Implement OAuth2Service**
   - Create `app/services/oauth_service.py`
   - Implement Microsoft OAuth2 flow
   - Add token refresh logic

3. **Add OAuth Endpoints**
   - Create `app/api/endpoints/oauth.py`
   - Add routes to router

4. **Update Configuration**
   - Add Microsoft OAuth2 credentials to `.env`:
     ```bash
     MICROSOFT_CLIENT_ID=your_client_id
     MICROSOFT_CLIENT_SECRET=your_client_secret
     MICROSOFT_TENANT_ID=common  # or specific tenant
     ```

5. **Update `SecretsStorage.get()` method**
   - Auto-refresh tokens when expired
   - Return None if refresh fails

### Phase 2: Tool Executor Enhancement (Week 2)

1. **Define Tool Permissions**
   - Create `app/utils/permissions.py`
   - Map each tool to required scopes

2. **Add PermissionRequiredError**
   - Update `app/core/exceptions.py`
   - Update exception handlers

3. **Enhance @with_oauth2_token Decorator**
   - Add auto-consent flow
   - Generate consent URLs when token missing

4. **Update Tool Handlers**
   - Update `@with_oauth2_token` decorators with correct `secret_key`:
     ```python
     @with_oauth2_token(secret_key="microsoft_calendar_write")
     def handle_book_a_meeting(context): ...

     @with_oauth2_token(secret_key="microsoft_calendar_read")
     def handle_get_room_availability(context): ...
     ```

### Phase 3: Frontend Implementation (Week 2-3)

1. **OAuth Callback Page**
   - Create `app/oauth/callback/page.tsx`
   - Handle code exchange

2. **Permission Request UI**
   - Create modal/dialog component
   - Show permission details and scopes
   - Open consent popup

3. **API Proxy Endpoints**
   - Create `app/api/oauth/authorize/route.ts`
   - Create `app/api/oauth/callback/route.ts`
   - Proxy to secrets-manager

4. **Chat Error Handling**
   - Detect `permission_required` errors
   - Show permission request UI
   - Retry after authorization

### Phase 4: Testing & Documentation (Week 3)

1. **Unit Tests**
   - Test OAuth2Service methods
   - Test token refresh logic
   - Test permission decorator

2. **Integration Tests**
   - Test full OAuth flow end-to-end
   - Test auto-refresh behavior
   - Test error scenarios

3. **Documentation**
   - Update API documentation
   - Add OAuth setup guide
   - Document permission system

---

## Environment Variables

### Secrets Manager
```bash
# OAuth2 Configuration
MICROSOFT_CLIENT_ID=your_app_client_id
MICROSOFT_CLIENT_SECRET=your_app_client_secret
MICROSOFT_TENANT_ID=common  # or specific tenant ID

# Frontend URL for redirect
FRONTEND_URL=http://localhost:3000
```

### Frontend
```bash
# OAuth redirect URI
NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:3000/oauth/callback
```

---

## Security Considerations

1. **State Parameter**
   - Encrypt state with user_id and secret_key
   - Validate state on callback
   - Prevent CSRF attacks

2. **Token Storage**
   - Encrypt access & refresh tokens
   - Store in MongoDB with proper access controls
   - Use API key authentication for secrets-manager

3. **Scope Validation**
   - Verify granted scopes match requested scopes
   - Reject insufficient permissions

4. **Token Refresh**
   - Auto-refresh before expiration
   - Handle refresh token expiration gracefully
   - Prompt re-authorization when needed

---

## User Experience Flow

1. **User sends message**: "Book a meeting room for tomorrow 2pm"

2. **Agent routes to meeting_agent**

3. **Meeting agent calls `book_a_meeting` tool**

4. **Tool executor checks for token** (`microsoft_calendar_write`)
   - Token not found → `PermissionRequiredError`

5. **Frontend receives error with consent URL**

6. **UI shows permission request**:
   ```
   📅 Calendar & Room Booking Permission Required

   The meeting agent needs permission to:
   - Read and write your calendar
   - View room availability

   [Authorize] [Cancel]
   ```

7. **User clicks "Authorize"**
   - Popup opens with Microsoft consent screen
   - User logs in and grants permissions

8. **Microsoft redirects to callback**
   - Frontend exchanges code for tokens
   - Tokens stored in secrets-manager

9. **User returns to chat**
   - Agent automatically retries tool call
   - Tool succeeds with new token

---

## Future Enhancements

1. **Multi-Provider Support**
   - Google OAuth2
   - GitHub OAuth2
   - Custom OAuth2 providers

2. **Permission Management UI**
   - View granted permissions
   - Revoke permissions
   - Re-authorize expired permissions

3. **Scope Minimization**
   - Request minimum required scopes
   - Upgrade scopes when needed

4. **Token Rotation**
   - Periodic rotation for security
   - Audit log for token usage

---

## Rollout Strategy

### Development
1. Set up Microsoft App Registration
2. Configure OAuth2 credentials
3. Deploy secrets-manager updates
4. Deploy tool-executor updates
5. Deploy frontend updates

### Testing
1. Test with test Microsoft account
2. Verify all tools work with new permissions
3. Test token refresh behavior
4. Test error scenarios

### Production
1. Update Microsoft App Registration for production
2. Deploy services in order:
   - Secrets Manager
   - Tool Executor
   - Frontend
3. Monitor error rates
4. Provide user support documentation

---

## Success Metrics

- ✅ User can authorize tools without technical knowledge
- ✅ Tokens auto-refresh before expiration (>95% success rate)
- ✅ Permission errors show clear consent UI
- ✅ OAuth flow completes in <30 seconds
- ✅ Zero plaintext tokens in logs or responses
