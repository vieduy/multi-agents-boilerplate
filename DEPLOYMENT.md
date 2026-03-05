# Multi-Agent System Deployment Guide

This guide covers deploying the Multi-Agent System with Nginx reverse proxy for production and development environments.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [Nginx Configuration](#nginx-configuration)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [Monitoring & Logs](#monitoring--logs)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Internet/Users                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
           ┌──────────────────┐
           │   Nginx Proxy    │  Port 80/443
           │  (Reverse Proxy) │
           └────────┬─────────┘
                    │
        ┌───────────┼───────────────────┐
        │           │                   │
        ▼           ▼                   ▼
   ┌────────┐  ┌─────────┐      ┌──────────┐
   │Frontend│  │ Agent   │      │  Auth    │
   │Next.js │  │ Router  │      │ Service  │
   │  :3000 │  │  :8000  │      │  :8001   │
   └────────┘  └────┬────┘      └────┬─────┘
                    │                │
        ┌───────────┼────────────────┼─────────┐
        │           │                │         │
        ▼           ▼                ▼         ▼
   ┌────────┐  ┌────────┐      ┌────────┐ ┌──────────┐
   │MongoDB │  │ Redis  │      │MongoDB │ │  Secrets │
   │(Router)│  │(Cache) │      │ (Auth) │ │ Manager  │
   └────────┘  └────────┘      └────────┘ └──────────┘
```

### Request Flow
- **Frontend requests**: `http://yourdomain.com/` → Nginx → Frontend (3000)
- **API requests**: `http://yourdomain.com/api/*` → Nginx → Agent Router (8000)
- **Auth requests**: `http://yourdomain.com/auth/*` → Nginx → Auth Service (8001)

---

## Prerequisites

### Required Software
- Docker >= 24.0
- Docker Compose >= 2.20
- Git
- (Optional) Node.js >= 20 for local development

### Required API Keys
- OpenAI API Key (or other LLM provider)

### System Requirements
- **Minimum**: 4GB RAM, 2 CPU cores, 20GB disk
- **Recommended**: 8GB RAM, 4 CPU cores, 50GB disk

---

## Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd multi-agents-boilerplate

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env  # or your preferred editor
```

### 2. Configure Environment

Edit `.env` and set at minimum:

```bash
# Required
OPENAI_API_KEY=sk-your-actual-api-key

# Security (MUST change in production)
JWT_SECRET_KEY=your-super-secure-random-32-char-key
AUTH_JWT_SECRET_KEY=your-super-secure-random-32-char-key
```

### 3. Create Docker Network

```bash
docker network create multi-agent-network
```

### 4. Start Services

**Production:**
```bash
docker-compose up -d
```

**Development:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### 5. Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Test endpoints
curl http://localhost/api/health
curl http://localhost/auth/health
curl http://localhost
```

---

## Development Setup

### Using Docker Compose Development Override

The `docker-compose.dev.yml` provides:
- Hot reload for all services
- Exposed ports for direct access
- Volume mounts for live code editing
- No Nginx (access services directly)

```bash
# Start in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Access services directly
# Frontend: http://localhost:3000
# Agent Router: http://localhost:8000
# Auth Service: http://localhost:8001

# View logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f frontend
```

### Development Endpoints

| Service | URL | Health Check |
|---------|-----|--------------|
| Frontend | http://localhost:3000 | http://localhost:3000/api/health |
| Agent Router | http://localhost:8000 | http://localhost:8000/health |
| Auth Service | http://localhost:8001 | http://localhost:8001/health |
| MongoDB (Router) | localhost:27017 | - |
| MongoDB (Auth) | localhost:27018 | - |
| MongoDB (Secrets) | localhost:27019 | - |
| Redis | localhost:6379 | - |

### Frontend Development

```bash
# Install dependencies locally
cd frontend
npm install

# Run outside Docker (optional)
npm run dev

# Build for production
npm run build
```

---

## Production Deployment

### 1. Environment Configuration

Review and update all production settings in `.env`:

```bash
# Security - CRITICAL
JWT_SECRET_KEY=<generate-strong-random-key>
AUTH_JWT_SECRET_KEY=<generate-strong-random-key>
SECRETS_ENCRYPTION_KEY=<32-char-random-key>
SECRETS_MANAGER_API_KEY=<random-api-key>

# Enable authentication
AUTH_ENABLED=true

# API Security
API_KEY_REQUIRED=true
RATE_LIMIT_PER_MINUTE=100

# Performance tuning
SEMANTIC_CACHE_ENABLED=true
SEMANTIC_CACHE_THRESHOLD=0.95
```

### 2. Generate Secrets

```bash
# Generate random secrets (Linux/Mac)
openssl rand -base64 32

# Or use Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Build and Deploy

```bash
# Create network
docker network create multi-agent-network

# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f nginx
```

### 4. Production Health Checks

```bash
# Check Nginx
curl http://localhost/api/health
curl http://localhost/auth/health

# Check individual services (if ports exposed)
docker exec agent-router curl http://localhost:8000/health
docker exec auth-service curl http://localhost:8001/health
```

---

## Environment Variables

### Core Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key (required) |
| `FRONTEND_PORT` | 3000 | Frontend exposed port |
| `NGINX_HTTP_PORT` | 80 | Nginx HTTP port |
| `NGINX_HTTPS_PORT` | 443 | Nginx HTTPS port |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_ENABLED` | false | Enable authentication |
| `JWT_SECRET_KEY` | - | JWT signing secret |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 30 | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 7 | Refresh token lifetime |

### LLM Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | openai | LLM provider (openai, anthropic, etc.) |
| `LLM_MODEL` | gpt-4o-mini | Model name |
| `LLM_TEMPERATURE` | 0.1 | Response randomness |
| `ENABLE_LLM_FALLBACK` | true | Enable LLM-based routing fallback |

See [.env.example](.env.example) for complete list.

---

## Nginx Configuration

### Directory Structure

```
nginx/
├── nginx.conf           # Main Nginx configuration
├── conf.d/
│   └── default.conf    # Virtual host configuration
├── ssl/                # SSL certificates (add your own)
│   ├── fullchain.pem
│   └── privkey.pem
└── logs/               # Nginx logs
    ├── access.log
    └── error.log
```

### Customizing Nginx

Edit [nginx/conf.d/default.conf](nginx/conf.d/default.conf):

```nginx
# Increase timeout for long-running requests
proxy_read_timeout 600s;

# Adjust rate limiting
limit_req zone=api_limit burst=100 nodelay;

# Add custom headers
add_header X-Custom-Header "value" always;
```

### URL Routing

| URL Pattern | Backend Service | Notes |
|-------------|----------------|-------|
| `/` | Frontend (3000) | Main UI |
| `/api/*` | Agent Router (8000) | Strips `/api` prefix |
| `/auth/*` | Auth Service (8001) | Strips `/auth` prefix |
| `/_next/*` | Frontend (3000) | Static assets, cached |

### Rate Limiting

Default rate limits:
- API endpoints: 100 requests/second (burst: 50)
- Auth endpoints: 20 requests/second (burst: 10)

Adjust in [nginx/conf.d/default.conf](nginx/conf.d/default.conf):

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
```

---

## SSL/HTTPS Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Set permissions
sudo chown $USER:$USER nginx/ssl/*.pem
```

### Option 2: Self-Signed (Development)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=localhost"
```

### Enable HTTPS in Nginx

Uncomment the HTTPS server block in [nginx/conf.d/default.conf](nginx/conf.d/default.conf):

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # ... rest of configuration
}
```

Restart Nginx:

```bash
docker-compose restart nginx
```

---

## Monitoring & Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f agent-router
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 nginx

# Nginx access logs
tail -f nginx/logs/access.log

# Nginx error logs
tail -f nginx/logs/error.log
```

### Health Checks

```bash
# Automated health check script
#!/bin/bash
services=("http://localhost/api/health" "http://localhost/auth/health" "http://localhost")

for url in "${services[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    echo "$url: $status"
done
```

### Monitoring Tools

**Recommended:**
- **Prometheus + Grafana**: Metrics collection and visualization
- **Loki**: Log aggregation
- **cAdvisor**: Container metrics

**Quick monitoring with Docker stats:**
```bash
docker stats
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check Docker logs
docker-compose logs

# Check if ports are in use
sudo netstat -tulpn | grep -E ':(80|443|3000|8000|8001)'

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Frontend Can't Connect to Backend

**Check environment variables:**
```bash
docker exec multi-agent-frontend env | grep NEXT_PUBLIC
```

Should show:
```
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_AUTH_SERVICE_URL=/auth
```

**Check browser console:**
- Open DevTools → Network tab
- Look for failed requests to `/api/*` or `/auth/*`

**Verify Nginx routing:**
```bash
# Test Nginx config
docker exec multi-agent-nginx nginx -t

# Check Nginx logs
docker-compose logs nginx
```

### Database Connection Issues

```bash
# Check MongoDB is running
docker exec router-mongo mongosh --eval "db.adminCommand('ping')"

# Check Redis
docker exec router-redis redis-cli ping

# Verify network
docker network inspect multi-agent-network
```

### Permission Denied Errors

```bash
# Fix volume permissions
sudo chown -R $USER:$USER agent-router/logs frontend/.next nginx/logs

# Or run with correct user in docker-compose.yml
user: "${UID}:${GID}"
```

### Frontend Build Fails

```bash
# Clear Next.js cache
rm -rf frontend/.next frontend/node_modules

# Rebuild
cd frontend
npm install
npm run build

# Or rebuild Docker image
docker-compose build frontend --no-cache
```

### Nginx 502 Bad Gateway

**Causes:**
1. Backend service not running
2. Backend not ready (still starting)
3. Network connectivity issues

**Debug:**
```bash
# Check backend is running
docker-compose ps

# Test backend directly
docker exec agent-router curl http://localhost:8000/health

# Check Nginx upstream config
docker exec multi-agent-nginx cat /etc/nginx/conf.d/default.conf
```

### Rate Limiting Issues

If you're being rate-limited:

```bash
# Increase limits in nginx/conf.d/default.conf
limit_req zone=api_limit burst=200 nodelay;

# Restart Nginx
docker-compose restart nginx
```

### SSL Certificate Errors

```bash
# Verify certificate files exist
ls -la nginx/ssl/

# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Check Nginx SSL config
docker exec multi-agent-nginx nginx -T | grep ssl
```

---

## Production Checklist

Before deploying to production:

- [ ] Change all default secrets (`JWT_SECRET_KEY`, etc.)
- [ ] Enable authentication (`AUTH_ENABLED=true`)
- [ ] Configure SSL certificates
- [ ] Set up proper DNS records
- [ ] Configure firewall rules
- [ ] Set up backup for MongoDB volumes
- [ ] Configure log rotation
- [ ] Set up monitoring and alerts
- [ ] Test all endpoints
- [ ] Review rate limits
- [ ] Enable HTTPS redirect in Nginx
- [ ] Document emergency procedures
- [ ] Set up CI/CD pipeline (optional)

---

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Let's Encrypt](https://letsencrypt.org/getting-started/)

---

## Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Review this guide's troubleshooting section
- Open an issue in the project repository
