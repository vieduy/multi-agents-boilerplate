# Frontend Quick Reference - Auth Service Integration

Quick copy-paste reference for integrating the auth service.

## 🔗 Service URLs

```typescript
const AUTH_SERVICE_URL = 'http://localhost:8001';
const AGENT_ROUTER_URL = 'http://localhost:8000';
```

## 📋 API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/auth/register` | POST | ❌ | Register new user |
| `/api/v1/auth/login` | POST | ❌ | Login user |
| `/api/v1/auth/me` | GET | ✅ | Get current user |
| `/api/v1/auth/refresh` | POST | ✅ (Refresh) | Refresh access token |
| `/api/v1/auth/logout` | POST | ✅ | Logout user |
| `/health` | GET | ❌ | Health check |

## 🚀 Quick Implementation

### 1. Register User

```typescript
const response = await fetch('http://localhost:8001/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    full_name: 'John Doe'
  })
});

const { access_token, refresh_token, user } = await response.json();

// Store tokens
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);
```

### 2. Login User

```typescript
const response = await fetch('http://localhost:8001/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { access_token, refresh_token, user } = await response.json();
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);
```

### 3. Get Current User

```typescript
const accessToken = localStorage.getItem('access_token');

const response = await fetch('http://localhost:8001/api/v1/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const user = await response.json();
```

### 4. Refresh Token

```typescript
const refreshToken = localStorage.getItem('refresh_token');

const response = await fetch('http://localhost:8001/api/v1/auth/refresh', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${refreshToken}`
  }
});

const { access_token } = await response.json();
localStorage.setItem('access_token', access_token);
```

### 5. Logout

```typescript
const accessToken = localStorage.getItem('access_token');

await fetch('http://localhost:8001/api/v1/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Clear local storage
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
```

### 6. Protected API Calls (with Agent Router)

```typescript
const accessToken = localStorage.getItem('access_token');

const response = await fetch('http://localhost:8000/api/v1/route', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    query: 'What is the weather?',
    session_id: 'session-123'
  })
});

const result = await response.json();
```

## 📦 Response Formats

### Auth Success Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "69a65abb05f3e45f0edfe00c",
    "email": "user@example.com",
    "full_name": "John Doe",
    "is_active": true,
    "is_verified": true,
    "roles": ["user"]
  }
}
```

### User Response

```json
{
  "id": "69a65abb05f3e45f0edfe00c",
  "email": "user@example.com",
  "username": null,
  "full_name": "John Doe",
  "is_active": true,
  "is_verified": true,
  "created_at": "2026-03-03T03:51:23.360000",
  "roles": ["user"]
}
```

### Error Response

```json
{
  "detail": "Error message here"
}
```

## 🎯 TypeScript Types

```typescript
interface User {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  roles: string[];
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  message?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
  username?: string;
}
```

## ⚠️ Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `400` | Bad Request | Show error to user |
| `401` | Unauthorized | Refresh token or redirect to login |
| `403` | Forbidden | Show "Access Denied" |
| `422` | Validation Error | Show field errors |
| `500` | Server Error | Show generic error |

## ⏱️ Token Lifetimes

- **Access Token:** 30 minutes
- **Refresh Token:** 7 days

## 🔄 Auto-Refresh Pattern

```typescript
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let accessToken = localStorage.getItem('access_token');

  // Add auth header
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`
  };

  let response = await fetch(url, { ...options, headers });

  // If 401, try to refresh
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refresh_token');

    if (refreshToken) {
      // Refresh the token
      const refreshResponse = await fetch('http://localhost:8001/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${refreshToken}` }
      });

      if (refreshResponse.ok) {
        const { access_token } = await refreshResponse.json();
        localStorage.setItem('access_token', access_token);

        // Retry with new token
        headers['Authorization'] = `Bearer ${access_token}`;
        response = await fetch(url, { ...options, headers });
      } else {
        // Refresh failed, redirect to login
        window.location.href = '/login';
      }
    }
  }

  return response;
}
```

## 🧪 Test Credentials

```typescript
{
  email: 'testuser@example.com',
  password: 'testpass123',
  full_name: 'Test User'
}
```

## 🔍 Debugging

```bash
# Check service health
curl http://localhost:8001/health

# Test with curl
curl -X POST "http://localhost:8001/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test1234"}'

# View API docs
open http://localhost:8001/docs
```

## 📌 Common Patterns

### Check if User is Logged In

```typescript
function isLoggedIn(): boolean {
  return !!localStorage.getItem('access_token');
}
```

### Get User ID from Token

```typescript
function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub;
  } catch {
    return null;
  }
}
```

### Clear All Auth Data

```typescript
function clearAuth() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  // Clear any other user data
}
```

## 🎨 UI States

```typescript
// Loading state
if (isLoading) {
  return <Spinner />;
}

// Not authenticated
if (!user) {
  return <LoginPage />;
}

// Authenticated
return <Dashboard user={user} />;
```

## 🔐 Security Checklist

- [ ] Store tokens in localStorage (or HTTP-only cookies for production)
- [ ] Never log tokens to console in production
- [ ] Clear tokens on logout
- [ ] Implement auto-refresh before token expires
- [ ] Handle 401 errors gracefully
- [ ] Validate user input before sending to API
- [ ] Use HTTPS in production
- [ ] Implement CSRF protection if using cookies

## 📞 Support

- API Docs: http://localhost:8001/docs
- Health Check: http://localhost:8001/health
- Full Guide: [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md)

---

**Quick Copy Files:**
- Full Integration Guide: `FRONTEND_INTEGRATION_GUIDE.md`
- Backend README: `auth-service/README.md`
- Quick Start: `QUICK_START.md`
