# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Browser                               │
│                                                                      │
│  User accesses: http://yourdomain.com                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ HTTP/HTTPS
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                        Nginx Reverse Proxy                           │
│                         (Port 80 / 443)                              │
│                                                                      │
│  Routes:                                                             │
│  • /          → Frontend                                             │
│  • /api/*     → Agent Router (strips /api)                           │
│  • /auth/*    → Auth Service (strips /auth)                          │
│                                                                      │
│  Features:                                                           │
│  • SSL Termination                                                   │
│  • Rate Limiting                                                     │
│  • Gzip Compression                                                  │
│  • Security Headers                                                  │
│  • Load Balancing                                                    │
└───────────┬────────────────┬────────────────┬────────────────────────┘
            │                │                │
            │                │                │
┌───────────▼────────┐ ┌─────▼──────────┐ ┌──▼─────────────────┐
│    Frontend        │ │  Agent Router   │ │   Auth Service     │
│    (Next.js)       │ │   (FastAPI)     │ │    (FastAPI)       │
│    Port: 3000      │ │   Port: 8000    │ │    Port: 8001      │
│                    │ │                 │ │                    │
│  • React UI        │ │  • Route Agent  │ │  • User Auth       │
│  • SSR/SSG         │ │  • Orchestrate  │ │  • JWT Tokens      │
│  • API Client      │ │  • LLM Fallback │ │  • User Management │
└─────────┬──────────┘ └────────┬────────┘ └──────┬─────────────┘
          │                     │                   │
          │                     │                   │
          │    ┌────────────────┼───────────────────┼──────────┐
          │    │                │                   │          │
          │    │                │                   │          │
┌─────────▼────▼───┐  ┌─────────▼────────┐  ┌──────▼─────┐  ┌─▼──────────────┐
│   MongoDB        │  │     Redis         │  │  MongoDB   │  │ Secrets Mgr    │
│  (Router DB)     │  │  (Semantic Cache) │  │ (Auth DB)  │  │  + Tool Exec   │
│  Port: 27017     │  │   Port: 6379      │  │ Port:27017 │  │  Ports: 8092   │
│                  │  │                   │  │            │  │        8090    │
│  • Sessions      │  │  • Cache Results  │  │  • Users   │  │                │
│  • Conversation  │  │  • Rate Limiting  │  │  • Tokens  │  │  • API Keys    │
│  • History       │  │                   │  │            │  │  • Tool Exec   │
└──────────────────┘  └───────────────────┘  └────────────┘  └────────────────┘
```

## Network Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Docker Network: multi-agent-network               │
│                          (Bridge Mode)                               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    Application Layer                        │    │
│  │                                                             │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │    │
│  │  │ Frontend │  │  Agent   │  │   Auth   │  │ Secrets  │   │    │
│  │  │  :3000   │  │  Router  │  │ Service  │  │ Manager  │   │    │
│  │  │          │  │  :8000   │  │  :8001   │  │  :8092   │   │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Data Layer                                 │   │
│  │                                                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │  Mongo   │  │  Mongo   │  │  Mongo   │  │  Redis   │    │   │
│  │  │ (Router) │  │  (Auth)  │  │(Secrets) │  │ (Cache)  │    │   │
│  │  │ :27017   │  │ :27017   │  │ :27017   │  │  :6379   │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   Proxy Layer                                 │  │
│  │                                                               │  │
│  │  ┌──────────────────────────────────────────────────────┐    │  │
│  │  │                Nginx                                  │    │  │
│  │  │         :80 (HTTP)  :443 (HTTPS)                     │    │  │
│  │  └──────────────────────────────────────────────────────┘    │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
         │                              │
         │ Exposed Ports                │
         │                              │
    Port 80 (HTTP)                 Port 443 (HTTPS)
         │                              │
         └──────────────┬───────────────┘
                        │
                   Public Internet
```

## Request Flow Diagram

### Frontend Page Load

```
1. User Browser
   │
   │ GET http://yourdomain.com/
   │
   ▼
2. Nginx (:80)
   │
   │ proxy_pass http://frontend:3000/
   │
   ▼
3. Frontend Container
   │
   │ Serve Next.js page (HTML/CSS/JS)
   │
   ▼
4. User Browser
   │ Page rendered
   └─────► User sees UI
```

### API Request Flow (Chat Message)

```
1. User Browser
   │
   │ POST http://yourdomain.com/api/v1/route
   │ Body: { query: "Hello", session_id: "xxx" }
   │
   ▼
2. Nginx (:80)
   │
   │ Match: location /api/
   │ Strip /api prefix
   │ proxy_pass http://agent-router:8000/v1/route
   │
   ▼
3. Agent Router Container (:8000)
   │
   │ ┌─────────────────────────────────┐
   │ │ 1. Check semantic cache (Redis)  │
   │ │ 2. Route to appropriate agent    │
   │ │ 3. Execute LLM call              │
   │ │ 4. Stream response               │
   │ │ 5. Save to MongoDB               │
   │ └─────────────────────────────────┘
   │
   │ Queries:
   ├──► Redis (Cache lookup/save)
   └──► MongoDB (Save conversation)
   │
   │ SSE Stream Response
   │
   ▼
4. Nginx (:80)
   │
   │ Stream response back
   │ (proxy_buffering off)
   │
   ▼
5. User Browser
   │
   └─────► Real-time streaming text display
```

### Authentication Flow

```
1. User Browser
   │
   │ POST http://yourdomain.com/auth/login
   │ Body: { email: "user@example.com", password: "***" }
   │
   ▼
2. Nginx (:80)
   │
   │ Match: location /auth/
   │ Rate limit: 20 req/s
   │ Strip /auth prefix
   │ proxy_pass http://auth-service:8001/login
   │
   ▼
3. Auth Service Container (:8001)
   │
   │ ┌─────────────────────────────────┐
   │ │ 1. Query user from MongoDB       │
   │ │ 2. Verify password hash          │
   │ │ 3. Generate JWT tokens           │
   │ │ 4. Return access + refresh token │
   │ └─────────────────────────────────┘
   │
   ├──► MongoDB (User lookup)
   │
   │ Response: { access_token: "...", refresh_token: "..." }
   │
   ▼
4. Nginx (:80)
   │
   │ Forward response
   │
   ▼
5. User Browser
   │
   │ Save tokens to localStorage
   │ Redirect to main page
   └─────► Authenticated session
```

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    User Interaction                           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                  Frontend (React)                             │
│                                                               │
│  1. User types message                                        │
│  2. Call API: POST /api/v1/route                              │
│  3. Handle SSE stream                                         │
│  4. Display response in UI                                    │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                 Nginx (Reverse Proxy)                         │
│                                                               │
│  1. Receive request                                           │
│  2. Apply rate limiting                                       │
│  3. Route to backend service                                  │
│  4. Stream response back                                      │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              Agent Router (Orchestration)                     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ Step 1: Check Semantic Cache (Redis)                 │     │
│  │   • Hash query embedding                             │     │
│  │   • Search for similar cached response               │     │
│  │   • Return if match > 0.95 similarity                │     │
│  └─────────────────────────────────────────────────────┘     │
│                       │                                       │
│                       │ Cache miss                            │
│                       ▼                                       │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ Step 2: Route Selection                              │     │
│  │   • Embed query using OpenAI                         │     │
│  │   • Compare with route embeddings                    │     │
│  │   • Select best matching agent                       │     │
│  │   • Fallback to LLM if score < threshold             │     │
│  └─────────────────────────────────────────────────────┘     │
│                       │                                       │
│                       ▼                                       │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ Step 3: Execute Agent                                │     │
│  │   • Call selected agent                              │     │
│  │   • Stream response chunks                           │     │
│  │   • Handle tool calls                                │     │
│  └─────────────────────────────────────────────────────┘     │
│                       │                                       │
│                       ▼                                       │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ Step 4: Save to History                              │     │
│  │   • Save query to MongoDB                            │     │
│  │   • Save response to MongoDB                         │     │
│  │   • Cache result in Redis                            │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
└──────────────────────┬───────────────────────────────────────┘
                       │
            ┌──────────┼──────────┐
            │          │          │
            ▼          ▼          ▼
      ┌─────────┐ ┌────────┐ ┌───────┐
      │  Redis  │ │ MongoDB│ │  LLM  │
      │         │ │        │ │ (API) │
      │ Cache   │ │History │ │       │
      └─────────┘ └────────┘ └───────┘
```

## Component Responsibilities

### Nginx Reverse Proxy
**Purpose:** Single entry point and traffic management

**Responsibilities:**
- Route HTTP requests to appropriate service
- SSL/TLS termination
- Rate limiting and DDoS protection
- Gzip compression
- Security headers
- Load balancing (when scaled)
- Static file caching

**Configuration:**
- Main: `nginx/nginx.conf`
- Routes: `nginx/conf.d/default.conf`

---

### Frontend (Next.js)
**Purpose:** User interface and client-side logic

**Responsibilities:**
- Render React components
- Handle user input
- Call backend APIs
- Manage authentication state
- Display streaming responses
- Client-side routing

**Tech Stack:**
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

**Environment:**
- Production: Relative URLs (`/api`, `/auth`)
- Development: Absolute URLs (`http://localhost:8000`)

---

### Agent Router
**Purpose:** Orchestrate multi-agent system

**Responsibilities:**
- Route queries to appropriate agents
- Manage conversation context
- Semantic caching
- LLM fallback routing
- Session management
- Response streaming

**Key Features:**
- Embedding-based routing
- Conversation history
- Tool calling support
- Rate limiting

**Dependencies:**
- MongoDB (conversation storage)
- Redis (semantic cache)
- OpenAI (embeddings + LLM)

---

### Auth Service
**Purpose:** User authentication and authorization

**Responsibilities:**
- User registration
- Login/logout
- JWT token generation
- Token refresh
- Password hashing
- User management

**Tech Stack:**
- FastAPI
- MongoDB
- JWT
- bcrypt

**Endpoints:**
- POST `/register`
- POST `/login`
- POST `/refresh`
- GET `/me`
- POST `/logout`

---

### Secrets Manager
**Purpose:** Secure credential storage

**Responsibilities:**
- Store API keys
- Encrypt secrets at rest
- Provide secrets to services
- API key management

**Security:**
- Encryption key
- API key authentication
- Internal network only

---

### Tool Executor
**Purpose:** Execute agent tools safely

**Responsibilities:**
- Execute Python code
- Call external APIs
- Run system commands
- Return results to agents

**Security:**
- Sandboxed execution
- Resource limits
- Input validation

---

### MongoDB Instances
**Purpose:** Persistent data storage

**Instances:**
1. **Router MongoDB** - Conversation history
2. **Auth MongoDB** - User accounts
3. **Secrets MongoDB** - API keys/secrets

**Why Separate:**
- Data isolation
- Independent scaling
- Backup strategies
- Security boundaries

---

### Redis
**Purpose:** Caching and performance

**Use Cases:**
- Semantic cache (similar queries)
- Rate limiting counters
- Session storage
- Temporary data

**Features:**
- Persistence (AOF)
- Low latency
- TTL support

---

## Scaling Strategies

### Horizontal Scaling

```
                    ┌──────────────┐
                    │     Nginx    │
                    │ Load Balancer│
                    └───────┬──────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐     ┌──────────┐
    │Frontend 1│      │Frontend 2│     │Frontend 3│
    └──────────┘      └──────────┘     └──────────┘

    ┌──────────┐      ┌──────────┐     ┌──────────┐
    │ Router 1 │      │ Router 2 │     │ Router 3 │
    └──────────┘      └──────────┘     └──────────┘
```

**To scale:**
```bash
docker-compose up -d --scale agent-router=3 --scale frontend=3
```

### Database Scaling

**MongoDB:**
- Replica sets for high availability
- Sharding for large datasets

**Redis:**
- Redis Cluster for scaling
- Redis Sentinel for HA

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Layer 1: Network Security                           │     │
│  │  • Firewall (only 80/443 exposed)                   │     │
│  │  • Docker network isolation                         │     │
│  │  • No direct backend access                         │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Layer 2: Application Security                       │     │
│  │  • Rate limiting (Nginx)                            │     │
│  │  • CORS configuration                               │     │
│  │  • Security headers                                 │     │
│  │  • Request validation                               │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Layer 3: Authentication                             │     │
│  │  • JWT tokens                                       │     │
│  │  • Password hashing (bcrypt)                        │     │
│  │  • Token expiration                                 │     │
│  │  • Refresh token rotation                           │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Layer 4: Data Security                              │     │
│  │  • Environment variable secrets                     │     │
│  │  • Encrypted secrets manager                        │     │
│  │  • Non-root containers                              │     │
│  │  • Volume permissions                               │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Stack                          │
│                                                              │
│  Services → Logs → Nginx logs, Docker logs                  │
│         ↓                                                    │
│  Metrics → Health checks, Container stats                    │
│         ↓                                                    │
│  Alerts → Email, Slack, PagerDuty                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Built-in Health Checks:**
- `/api/health` - Agent Router
- `/auth/health` - Auth Service
- `/api/health` - Frontend
- Docker healthchecks

**Logs:**
- `nginx/logs/access.log` - HTTP requests
- `nginx/logs/error.log` - Nginx errors
- `docker-compose logs` - Container logs

**Metrics (Optional):**
- Prometheus for metrics collection
- Grafana for visualization
- cAdvisor for container metrics

---

This architecture provides a solid foundation for a production multi-agent system with room for growth and scaling.
