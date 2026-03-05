# OAuth2 Permission Flow - Implementation Status

## ✅ Completed Implementation (Backend)

### Phase 1: Secrets Manager Enhancement ✅

**Files Created:**
- `secrets-manager/app/services/oauth_service.py` - OAuth2 service with token management
- `secrets-manager/app/api/endpoints/oauth.py` - OAuth2 API endpoints
- `secrets-manager/.env.example` - OAuth2 configuration template

**Files Modified:**
- `secrets-manager/app/models/schemas.py` - Added OAuth2 request/response models
- `secrets-manager/app/api/router.py` - Registered OAuth endpoints
- `secrets-manager/app/api/endpoints/__init__.py` - Exported OAuth module
- `secrets-manager/app/core/config.py` - Added OAuth2 settings
- `docker-compose.yml` - Added OAuth2 environment variables

**Features Implemented:**
- ✅ Microsoft OAuth2 authorization URL generation
- ✅ Authorization code exchange for tokens
- ✅ Automatic token refresh with refresh tokens
- ✅ Token storage with expiration tracking
- ✅ OAuth status check endpoint
- ✅ Encrypted state parameter for CSRF protection

**New API Endpoints:**
```
POST   /api/v1/oauth/{provider}/authorize   - Generate auth URL
POST   /api/v1/oauth/{provider}/callback    - Handle OAuth callback
GET    /api/v1/oauth/status/{user_id}/{secret_key} - Check auth status
POST   /api/v1/oauth/refresh/{user_id}/{secret_key} - Manual refresh
GET    /api/v1/oauth/token/{user_id}/{secret_key} - Get token with auto-refresh
```

---

### Phase 2: Tool Executor Enhancement ✅

**Files Created:**
- `tool-executor/app/utils/permissions.py` - Tool permissions registry

**Files Modified:**
- `tool-executor/app/core/exceptions.py` - Added `PermissionRequiredError`
- `tool-executor/app/core/exception_handlers.py` - Added permission error handler
- `tool-executor/app/main.py` - Registered permission error handler
- `tool-executor/app/utils/auth.py` - Enhanced with auto-consent flow
- `tool-executor/app/utils/handlers/room_handlers.py` - Updated with specific secret_keys
- `tool-executor/app/core/config.py` - Added `frontend_url` setting

**Features Implemented:**
- ✅ Tool-to-permission mapping (TOOL_PERMISSIONS registry)
- ✅ Per-tool secret_key specification:
  - `book_a_meeting` → `microsoft_calendar_write`
  - `get_room_availability` → `microsoft_calendar_read`
  - `get_list_meeting` → `microsoft_calendar_read`
- ✅ Auto-consent flow when token missing
- ✅ Structured permission error response with consent URL
- ✅ OAuth2 scope definitions per tool

**Permission Error Response Format:**
```json
{
  "error": "permission_required",
  "message": "Permission required: Calendar & Room Booking",
  "consent_url": "http://localhost:3000/oauth/authorize?user_id=xxx&secret_key=microsoft_calendar_write&...",
  "secret_key": "microsoft_calendar_write",
  "scopes": ["Calendars.ReadWrite", "Calendars.ReadWrite.Shared", "Place.Read.All"],
  "provider": "microsoft",
  "display_name": "Calendar & Room Booking",
  "description": "Permission to book meetings and view room availability",
  "icon": "📅",
  "action_required": "oauth_consent",
  "authorized": false
}
```

---

### Configuration Updates ✅

**docker-compose.yml:**
```yaml
secrets-manager:
  environment:
    - MICROSOFT_CLIENT_ID=${MICROSOFT_CLIENT_ID:-}
    - MICROSOFT_CLIENT_SECRET=${MICROSOFT_CLIENT_SECRET:-}
    - MICROSOFT_TENANT_ID=${MICROSOFT_TENANT_ID:-common}
    - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}

tool-executor:
  environment:
    - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
```

**.env.example:**
```bash
# OAuth2 Configuration (Microsoft App Registration)
MICROSOFT_CLIENT_ID=your-microsoft-app-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-app-client-secret
MICROSOFT_TENANT_ID=common  # or your-specific-tenant-id

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

---

## 🚧 Remaining Work (Frontend)

### Phase 3: Frontend Implementation

**Files to Create:**
1. `frontend/app/oauth/authorize/page.tsx` - OAuth authorization initiation page
2. `frontend/app/oauth/callback/page.tsx` - OAuth callback handler
3. `frontend/app/api/oauth/authorize/route.ts` - API route to get auth URL
4. `frontend/app/api/oauth/callback/route.ts` - API route to exchange code
5. `frontend/components/PermissionRequestDialog.tsx` - Permission UI component
6. `frontend/lib/oauth-utils.ts` - OAuth helper functions

**Files to Modify:**
1. `frontend/components/ChatInterface.tsx` - Add error handling for permission_required
2. `frontend/lib/api-client.ts` - Add OAuth API methods (if exists)

**Features to Implement:**
- [ ] OAuth authorization page (redirects to Microsoft)
- [ ] OAuth callback page (exchanges code for tokens)
- [ ] Permission request dialog UI
- [ ] Chat error handling for permission_required
- [ ] Popup window management for OAuth flow
- [ ] Auto-retry after successful authorization

---

## 📋 Setup Instructions

### Step 1: Create Microsoft App Registration

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Create a new registration:
   - Name: "Multi-Agent System"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: `Web` → `http://localhost:3000/oauth/callback`
3. Note the **Application (client) ID**
4. Create a client secret:
   - Certificates & secrets → New client secret
   - Note the **Value** (client secret)
5. Add API permissions:
   - Microsoft Graph → Delegated permissions:
     - `Calendars.Read`
     - `Calendars.ReadWrite`
     - `Calendars.Read.Shared`
     - `Calendars.ReadWrite.Shared`
     - `Place.Read.All`
   - Grant admin consent (if required)

### Step 2: Configure Environment

Create or update `.env` file:
```bash
# OAuth2 Configuration
MICROSOFT_CLIENT_ID=<your-client-id-from-step-1>
MICROSOFT_CLIENT_SECRET=<your-client-secret-from-step-1>
MICROSOFT_TENANT_ID=common
FRONTEND_URL=http://localhost:3000

# Secrets Manager (generate secure keys)
SECRETS_MANAGER_API_KEY=$(openssl rand -hex 32)
SECRETS_ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
```

### Step 3: Rebuild and Restart Services

```bash
# Rebuild services with new code
docker-compose build secrets-manager tool-executor

# Restart services
docker-compose restart secrets-manager tool-executor

# Check logs
docker-compose logs -f secrets-manager tool-executor
```

---

## 🧪 Testing the Backend

### Test 1: Generate Authorization URL

```bash
curl -X POST http://localhost:8092/api/v1/oauth/microsoft/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-123",
    "secret_key": "microsoft_calendar_read",
    "scopes": ["Calendars.Read", "Place.Read.All"],
    "redirect_uri": "http://localhost:3000/oauth/callback",
    "provider": "microsoft"
  }'
```

Expected response:
```json
{
  "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...",
  "state": "encrypted_state_string"
}
```

### Test 2: Simulate OAuth Callback

1. Open the `auth_url` in a browser
2. Log in with Microsoft account
3. Copy the `code` and `state` from the redirect URL
4. Exchange code for tokens:

```bash
curl -X POST http://localhost:8092/api/v1/oauth/microsoft/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "<code-from-redirect>",
    "state": "<state-from-response>",
    "redirect_uri": "http://localhost:3000/oauth/callback",
    "provider": "microsoft"
  }'
```

Expected response:
```json
{
  "success": true,
  "user_id": "test-user-123",
  "secret_key": "microsoft_calendar_read",
  "expires_at": "2024-03-05T12:00:00"
}
```

### Test 3: Check Authorization Status

```bash
curl http://localhost:8092/api/v1/oauth/status/test-user-123/microsoft_calendar_read
```

Expected response (after authorization):
```json
{
  "authorized": true,
  "expires_at": "2024-03-05T12:00:00",
  "scopes": ["Calendars.Read", "Place.Read.All"],
  "provider": "microsoft"
}
```

### Test 4: Test Permission Required Error

```bash
# Call a tool without authorization
curl -X POST http://localhost:8090/api/v1/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "book_a_meeting",
    "arguments": {
      "room_email": "room@example.com",
      "start_time": "2024-03-05T10:00:00",
      "end_time": "2024-03-05T11:00:00"
    },
    "sessionAttributes": {
      "user_id": "unauthorized-user"
    }
  }'
```

Expected response (403):
```json
{
  "error": "permission_required",
  "message": "Permission required: Calendar & Room Booking",
  "consent_url": "http://localhost:3000/oauth/authorize?user_id=unauthorized-user&secret_key=microsoft_calendar_write&...",
  "secret_key": "microsoft_calendar_write",
  "scopes": ["Calendars.ReadWrite", "Calendars.ReadWrite.Shared", "Place.Read.All"],
  "provider": "microsoft",
  "display_name": "Calendar & Room Booking",
  "description": "Permission to book meetings and view room availability",
  "icon": "📅",
  "action_required": "oauth_consent",
  "authorized": false
}
```

---

## 🔄 Flow Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   User      │         │ Meeting Agent│         │ Tool Executor   │
└──────┬──────┘         └──────┬───────┘         └────────┬────────┘
       │                       │                          │
       │ "Book a meeting"      │                          │
       ├──────────────────────>│                          │
       │                       │ book_a_meeting(...)      │
       │                       ├─────────────────────────>│
       │                       │                          │
       │                       │                  ┌───────▼────────┐
       │                       │                  │ @with_oauth2   │
       │                       │                  │ Check token    │
       │                       │                  └───────┬────────┘
       │                       │                          │
       │                       │                  ┌───────▼────────────┐
       │                       │                  │ Secrets Manager    │
       │                       │                  │ GET /secrets/      │
       │                       │                  │ user_id/secret_key │
       │                       │                  └───────┬────────────┘
       │                       │                          │
       │                       │                      Token not found
       │                       │                          │
       │                       │<──Permission Required────┤
       │<──Error with consent──┤     (403 + consent_url)  │
       │        URL            │                          │
       │                       │                          │
┌──────▼──────────┐            │                          │
│ Permission UI   │            │                          │
│ ┌─────────────┐ │            │                          │
│ │📅 Calendar  │ │            │                          │
│ │ & Booking   │ │            │                          │
│ │             │ │            │                          │
│ │ [Authorize] │ │            │                          │
│ └─────────────┘ │            │                          │
└────────┬────────┘            │                          │
         │                     │                          │
    Click Authorize            │                          │
         │                     │                          │
    ┌────▼─────────────────────▼──────────┐               │
    │  OAuth Flow (Microsoft Login)       │               │
    │  1. Redirect to Microsoft           │               │
    │  2. User grants permissions         │               │
    │  3. Redirect to /oauth/callback     │               │
    │  4. Exchange code for tokens        │               │
    │  5. Store in Secrets Manager        │──────────────>│
    └────────┬────────────────────────────┘               │
             │                                             │
    Token stored successfully                              │
             │                                             │
    ┌────────▼────────────────────────┐                    │
    │  Retry tool call                │                    │
    │  "Book a meeting" (auto)        ├───────────────────>│
    └─────────────────────────────────┘                    │
                                                      ✅ Success!
```

---

## 📚 Next Steps

1. **Implement Frontend OAuth Flow** (Phase 3)
   - Create OAuth pages and components
   - Handle permission request UI
   - Implement auto-retry logic

2. **Testing**
   - End-to-end OAuth flow testing
   - Token refresh testing
   - Error scenario testing

3. **Production Deployment**
   - Update Microsoft App Registration with production URLs
   - Configure production environment variables
   - Test with real users

4. **Documentation**
   - User guide for granting permissions
   - Admin guide for Microsoft App setup
   - Troubleshooting guide

---

## 🎯 Success Criteria

- ✅ Backend can generate OAuth authorization URLs
- ✅ Backend can exchange codes for tokens
- ✅ Backend can store tokens with refresh tokens
- ✅ Backend can auto-refresh expired tokens
- ✅ Tool executor returns structured permission errors
- ✅ Tool handlers use specific secret_keys
- [ ] Frontend can initiate OAuth flow
- [ ] Frontend can handle OAuth callback
- [ ] Frontend shows permission request UI
- [ ] End-to-end flow works without user intervention (after initial consent)

---

## 🐛 Known Limitations

1. **Frontend Not Implemented**: OAuth flow requires frontend pages to be built
2. **Single Provider**: Currently only supports Microsoft (extensible to Google, etc.)
3. **Manual Testing Required**: Automated OAuth testing is complex
4. **Token Revocation**: No UI for users to revoke permissions (must do via Microsoft account settings)

---

## 📖 Related Documentation

- [OAUTH2_PERMISSION_FLOW_PLAN.md](OAUTH2_PERMISSION_FLOW_PLAN.md) - Detailed implementation plan
- [secrets-manager/.env.example](secrets-manager/.env.example) - Configuration template
- [tool-executor/app/utils/permissions.py](tool-executor/app/utils/permissions.py) - Tool permissions registry
