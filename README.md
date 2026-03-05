# Multi-Agent System with Nginx Reverse Proxy

Production-grade multi-agent system with unified Docker Compose deployment and Nginx reverse proxy.

## 🚀 Quick Start

```bash
# 1. Clone repository
git clone <your-repo-url>
cd multi-agents-boilerplate

# 2. Setup environment
cp .env.example .env
# Edit .env and set your API keys and secrets

# 3. Deploy
./scripts/deploy.sh prod
```

That's it! Access your application at `http://localhost`

## 📋 Features

- ✅ **Unified Docker Compose**: Single command to deploy all services
- ✅ **Nginx Reverse Proxy**: Production-grade routing and load balancing
- ✅ **Internal Docker Network**: Secure service-to-service communication
- ✅ **Environment-Based Config**: Easy configuration via `.env` file
- ✅ **Development Mode**: Hot reload for rapid development
- ✅ **Health Checks**: Automated service health monitoring
- ✅ **SSL/HTTPS Ready**: Easy SSL certificate integration
- ✅ **Rate Limiting**: Built-in API rate limiting
- ✅ **Logging**: Centralized logging for all services

## 🏗️ Architecture

```
Client → Nginx (80/443) → Frontend (3000)
                        → API (8000)
                        → Auth (8001)
```

### Services

| Service | Port (Internal) | URL (via Nginx) |
|---------|----------------|-----------------|
| Frontend | 3000 | `http://localhost/` |
| Agent Router | 8000 | `http://localhost/api/` |
| Auth Service | 8001 | `http://localhost/auth/` |
| Nginx Proxy | 80, 443 | `http://localhost` |

## 📦 What's Included

- **Frontend**: Next.js application with SSR/SSG support
- **Agent Router**: Multi-agent orchestration and routing
- **Auth Service**: JWT-based authentication
- **Secrets Manager**: Secure credential storage
- **Tool Executor**: Agent tool execution service
- **Nginx**: Reverse proxy with SSL termination
- **MongoDB**: Document database (3 instances for different services)
- **Redis**: Caching and session storage

## 🛠️ Installation

### Prerequisites

- Docker >= 24.0
- Docker Compose >= 2.20
- Git

### Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and configure:**
   ```bash
   # Required
   OPENAI_API_KEY=sk-your-actual-api-key

   # Security (MUST change in production)
   JWT_SECRET_KEY=your-super-secure-random-32-char-key
   AUTH_JWT_SECRET_KEY=your-super-secure-random-32-char-key
   ```

3. **Generate secure secrets:**
   ```bash
   # Linux/Mac
   openssl rand -base64 32

   # Or Python
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

## 🚀 Deployment

### Production Deployment

```bash
# Using deployment script (recommended)
./scripts/deploy.sh prod

# Or manually
docker network create multi-agent-network
docker-compose up -d
```

Access: `http://localhost` or `http://your-server-ip`

### Development Deployment

```bash
# Using deployment script
./scripts/deploy.sh dev

# Or manually
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Development URLs:
- Frontend: `http://localhost:3000`
- Agent Router: `http://localhost:8000`
- Auth Service: `http://localhost:8001`

### Key Differences

| Feature | Production | Development |
|---------|-----------|-------------|
| Nginx | ✅ Enabled | ❌ Disabled |
| Hot Reload | ❌ No | ✅ Yes |
| Exposed Ports | Nginx only (80/443) | All services |
| Volume Mounts | Minimal | Full source code |
| API URLs | `/api`, `/auth` | `localhost:8000`, `localhost:8001` |

## 🔧 Configuration

### Environment Variables

See [.env.example](.env.example) for all available options.

**Critical Production Settings:**

```bash
# Authentication
AUTH_ENABLED=true
JWT_SECRET_KEY=<strong-random-secret>

# Security
API_KEY_REQUIRED=true
RATE_LIMIT_PER_MINUTE=100

# Performance
SEMANTIC_CACHE_ENABLED=true
ROUTER_CACHE_ENABLED=true
```

### Nginx Configuration

Configuration files:
- `nginx/nginx.conf` - Main configuration
- `nginx/conf.d/default.conf` - Virtual host and routing rules

**URL Routing:**
- `/` → Frontend
- `/api/*` → Agent Router (strips `/api` prefix)
- `/auth/*` → Auth Service (strips `/auth` prefix)

**Rate Limiting:**
- API endpoints: 100 req/s (burst: 50)
- Auth endpoints: 20 req/s (burst: 10)

## 🔐 SSL/HTTPS Setup

### Using Let's Encrypt

```bash
# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy to nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Uncomment HTTPS server block in nginx/conf.d/default.conf
# Restart Nginx
docker-compose restart nginx
```

### Self-Signed Certificate (Dev)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=localhost"
```

## 📊 Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f agent-router
docker-compose logs -f nginx

# Nginx access logs
tail -f nginx/logs/access.log
```

### Health Checks

```bash
# Via Nginx
curl http://localhost/api/health
curl http://localhost/auth/health

# Direct (development)
curl http://localhost:8000/health
curl http://localhost:8001/health
```

### Service Status

```bash
docker-compose ps
docker stats
```

## 🐛 Troubleshooting

### Services won't start

```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Frontend can't connect to backend

**Check environment variables:**
```bash
docker exec multi-agent-frontend env | grep NEXT_PUBLIC
```

Should show:
```
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_AUTH_SERVICE_URL=/auth
```

### Nginx 502 Bad Gateway

```bash
# Check backend is running
docker-compose ps

# Check logs
docker-compose logs agent-router
docker-compose logs nginx

# Test backend directly
docker exec agent-router curl http://localhost:8000/health
```

### Database connection issues

```bash
# Check MongoDB
docker exec router-mongo mongosh --eval "db.adminCommand('ping')"

# Check Redis
docker exec router-redis redis-cli ping
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive troubleshooting guide.

## 📁 Project Structure

```
.
├── docker-compose.yml          # Production configuration
├── docker-compose.dev.yml      # Development overrides
├── .env.example                # Environment template
├── DEPLOYMENT.md               # Detailed deployment guide
├── scripts/
│   └── deploy.sh              # Automated deployment script
├── nginx/
│   ├── nginx.conf             # Main Nginx config
│   ├── conf.d/
│   │   └── default.conf       # Virtual host config
│   ├── ssl/                   # SSL certificates
│   └── logs/                  # Nginx logs
├── frontend/
│   ├── Dockerfile             # Production Dockerfile
│   ├── Dockerfile.dev         # Development Dockerfile
│   ├── .env.production        # Production env vars
│   └── ...                    # Next.js app
├── agent-router/              # Agent routing service
├── auth-service/              # Authentication service
├── secrets-manager/           # Secrets management
└── tool-executor/             # Tool execution service
```

## 🔄 Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart a service
docker-compose restart frontend

# View logs
docker-compose logs -f

# Rebuild and restart
docker-compose up -d --build

# Remove everything (including volumes)
docker-compose down -v

# Shell into container
docker exec -it multi-agent-frontend sh
```

## 📚 Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Comprehensive deployment guide
- [.env.example](.env.example) - Environment variable reference
- [nginx/conf.d/default.conf](nginx/conf.d/default.conf) - Nginx routing configuration

## 🔒 Security Checklist

Before going to production:

- [ ] Change all default secrets
- [ ] Enable authentication (`AUTH_ENABLED=true`)
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Review CORS settings
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Review Nginx security headers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

[Your License Here]

## 🆘 Support

- Issues: [GitHub Issues](your-repo-url/issues)
- Documentation: [DEPLOYMENT.md](DEPLOYMENT.md)
- Questions: [Discussions](your-repo-url/discussions)

---

Made with ❤️ for production deployments
