# Authentication Service

A dedicated microservice for user authentication and JWT token management, built with FastAPI and MongoDB.

## Features

- ✅ User registration and login
- ✅ JWT-based authentication (access & refresh tokens)
- ✅ Password hashing with bcrypt
- ✅ Token verification endpoint for other services
- ✅ User profile management
- ✅ MongoDB for user storage
- ✅ CORS support
- ✅ Health check endpoints

## Technology Stack

- **Framework**: FastAPI
- **Database**: MongoDB (Motor async driver)
- **Authentication**: JWT (python-jose)
- **Password Hashing**: bcrypt (passlib)
- **Validation**: Pydantic

## Project Structure

```
auth-service/
├── src/
│   └── auth_service/
│       ├── main.py                 # FastAPI application entry point
│       ├── config.py               # Configuration settings
│       ├── models/
│       │   └── user.py             # User data model
│       ├── schemas/
│       │   ├── auth.py             # Auth request/response schemas
│       │   └── user.py             # User schemas
│       ├── api/
│       │   └── routes/
│       │       └── auth.py         # Authentication endpoints
│       ├── services/
│       │   ├── auth_service.py     # Business logic
│       │   └── jwt_service.py      # JWT token utilities
│       └── db/
│           └── repositories/
│               └── user_repository.py  # Database operations
├── requirements.txt
├── .env.example
└── README.md
```

## Installation

### Prerequisites

- Python 3.9+
- MongoDB 4.4+
- pip

### Setup

1. **Clone the repository**

```bash
cd auth-service
```

2. **Create virtual environment**

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**

```bash
pip install -r requirements.txt
```

4. **Configure environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

**Important**: Change the `JWT_SECRET_KEY` to a secure random string (min 32 characters) in production!

5. **Start MongoDB** (if running locally)

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:7

# Or use your local MongoDB installation
mongod
```

## Running the Service

### Development Mode

```bash
# From the auth-service directory
cd src
python -m auth_service.main

# Or using uvicorn directly
uvicorn auth_service.main:app --reload --host 0.0.0.0 --port 8001
```

The service will be available at: `http://localhost:8001`

### Production Mode

```bash
uvicorn auth_service.main:app --host 0.0.0.0 --port 8001 --workers 4
```

## API Endpoints

### Authentication

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/v1/auth/register` | POST | No | Register new user |
| `/api/v1/auth/login` | POST | No | Login and get JWT tokens |
| `/api/v1/auth/refresh` | POST | Yes (Refresh Token) | Get new access token |
| `/api/v1/auth/me` | GET | Yes | Get current user info |
| `/api/v1/auth/logout` | POST | Yes | Logout (client-side token removal) |
| `/api/v1/auth/verify` | POST | No | Verify token validity |
| `/health` | GET | No | Health check |

### API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## Usage Examples

### Register a New User

```bash
curl -X POST "http://localhost:8001/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "full_name": "John Doe"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "full_name": "John Doe",
    "is_active": true,
    "is_verified": true,
    "created_at": "2024-01-01T00:00:00",
    "roles": ["user"]
  },
  "message": "User registered successfully"
}
```

### Login

```bash
curl -X POST "http://localhost:8001/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

### Get Current User

```bash
curl -X GET "http://localhost:8001/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Access Token

```bash
curl -X POST "http://localhost:8001/api/v1/auth/refresh" \
  -H "Authorization: Bearer YOUR_REFRESH_TOKEN"
```

### Verify Token (for other services)

```bash
curl -X POST "http://localhost:8001/api/v1/auth/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_ACCESS_TOKEN"
  }'
```

## Configuration

All configuration is done via environment variables (see `.env.example`):

### Server Settings
- `AUTH_SERVICE_HOST`: Host to bind (default: 0.0.0.0)
- `AUTH_SERVICE_PORT`: Port to bind (default: 8001)

### JWT Settings
- `JWT_SECRET_KEY`: Secret key for signing tokens (REQUIRED - change in production!)
- `JWT_ALGORITHM`: Algorithm for JWT signing (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Access token lifetime (default: 30 minutes)
- `REFRESH_TOKEN_EXPIRE_DAYS`: Refresh token lifetime (default: 7 days)

### Database Settings
- `MONGO_URI`: MongoDB connection string (default: mongodb://localhost:27017)
- `MONGO_DATABASE`: Database name (default: auth_db)
- `MONGO_COLLECTION_USERS`: Users collection name (default: users)

### Security Settings
- `PASSWORD_MIN_LENGTH`: Minimum password length (default: 8)
- `REQUIRE_EMAIL_VERIFICATION`: Require email verification (default: false)

### CORS Settings
- `CORS_ORIGINS`: Comma-separated allowed origins (default: http://localhost:3000,http://localhost:3001)

## Security Considerations

### Production Checklist

- [ ] **Change JWT_SECRET_KEY** to a secure random string (min 32 characters)
- [ ] **Use HTTPS** in production
- [ ] **Restrict CORS origins** to your frontend domain only
- [ ] **Enable email verification** (set `REQUIRE_EMAIL_VERIFICATION=true`)
- [ ] **Use MongoDB authentication** and encrypted connections
- [ ] **Implement rate limiting** on login/register endpoints
- [ ] **Add password complexity requirements**
- [ ] **Implement token blacklisting** for logout (using Redis)
- [ ] **Monitor and log authentication attempts**
- [ ] **Set secure cookie flags** if using cookies for token storage
- [ ] **Implement account lockout** after failed login attempts
- [ ] **Add password reset functionality**

### Token Security

- Access tokens are short-lived (30 minutes by default)
- Refresh tokens are longer-lived (7 days by default)
- All passwords are hashed using bcrypt
- Tokens include user roles for authorization

## Integration with Other Services

### Agent Router Integration

The Agent Router can optionally verify tokens from this service:

```python
# In agent router
from jose import jwt

def verify_token(token: str):
    payload = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm]
    )
    return payload
```

Or make a request to the `/api/v1/auth/verify` endpoint.

### Frontend Integration

Store tokens in localStorage or HTTP-only cookies:

```typescript
// Login
const response = await fetch('http://localhost:8001/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { access_token, refresh_token } = await response.json();
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);

// Use token in requests
const response = await fetch('http://localhost:8000/api/v1/route', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify({ query: 'Hello' })
});
```

## Testing

Run tests (when implemented):

```bash
pytest
```

## Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

CMD ["uvicorn", "auth_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

Build and run:

```bash
docker build -t auth-service .
docker run -p 8001:8001 --env-file .env auth-service
```

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Check connection string
echo $MONGO_URI
```

### Token Verification Fails

- Ensure `JWT_SECRET_KEY` matches between services
- Check token expiration time
- Verify token format: `Bearer <token>`

### CORS Errors

- Add your frontend URL to `CORS_ORIGINS`
- Ensure credentials are included in requests if needed

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
