# Quick Reference Guide

## 🚀 Quick Commands

### Deployment

```bash
# Production deployment
./scripts/deploy.sh prod

# Development deployment
./scripts/deploy.sh dev

# Manual production
docker network create multi-agent-network
docker-compose up -d

# Manual development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Service Management

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart specific service
docker-compose restart frontend

# Rebuild and restart
docker-compose up -d --build

# Scale services
docker-compose up -d --scale agent-router=3

# Remove everything (including volumes)
docker-compose down -v
```

### Logs & Debugging

```bash
# View all logs
docker-compose logs -f

# Service-specific logs
docker-compose logs -f frontend
docker-compose logs -f agent-router
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 nginx

# Nginx logs
tail -f nginx/logs/access.log
tail -f nginx/logs/error.log

# Shell into container
docker exec -it multi-agent-frontend sh
docker exec -it agent-router bash
```

### Health Checks

```bash
# Production (via Nginx)
curl http://localhost/api/health
curl http://localhost/auth/health
curl http://localhost

# Development (direct)
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:3000/api/health

# Check all services
docker-compose ps

# Container stats
docker stats
```

### Database Access

```bash
# MongoDB (Router)
docker exec -it router-mongo mongosh
# use agent_router
# db.conversation_messages.find()

# MongoDB (Auth)
docker exec -it auth-mongo mongosh
# use auth_db
# db.users.find()

# Redis
docker exec -it router-redis redis-cli
# KEYS *
# GET key_name
```

## 📋 URLs

### Production (Nginx)
- Application: `http://localhost`
- API: `http://localhost/api`
- Auth: `http://localhost/auth`
- API Health: `http://localhost/api/health`
- Auth Health: `http://localhost/auth/health`

### Development (Direct Access)
- Frontend: `http://localhost:3000`
- Agent Router: `http://localhost:8000`
- Auth Service: `http://localhost:8001`
- Router Docs: `http://localhost:8000/docs`
- Auth Docs: `http://localhost:8001/docs`

### Database Connections (Dev)
- MongoDB (Router): `mongodb://localhost:27017`
- MongoDB (Auth): `mongodb://localhost:27018`
- MongoDB (Secrets): `mongodb://localhost:27019`
- Redis: `redis://localhost:6379`

## 🔧 Environment Variables

### Required
```bash
OPENAI_API_KEY=sk-your-api-key-here
JWT_SECRET_KEY=your-32-char-secret
AUTH_JWT_SECRET_KEY=your-32-char-secret
```

### Important Production Settings
```bash
AUTH_ENABLED=true
API_KEY_REQUIRED=true
RATE_LIMIT_PER_MINUTE=100
SEMANTIC_CACHE_ENABLED=true
```

### Port Configuration
```bash
FRONTEND_PORT=3000
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
```

## 📁 Important Files

### Configuration
- `.env` - Environment variables
- `docker-compose.yml` - Production config
- `docker-compose.dev.yml` - Development overrides
- `nginx/nginx.conf` - Main Nginx config
- `nginx/conf.d/default.conf` - Route configuration

### Documentation
- `README.md` - Quick start guide
- `DEPLOYMENT.md` - Full deployment guide
- `ARCHITECTURE.md` - System architecture
- `IMPLEMENTATION_SUMMARY.md` - Solution overview

### Scripts
- `scripts/deploy.sh` - Automated deployment

## 🛠️ Troubleshooting

### Services Won't Start
```bash
# Check logs
docker-compose logs

# Check ports
sudo netstat -tulpn | grep -E ':(80|443|3000|8000|8001)'

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Frontend Can't Connect
```bash
# Check environment
docker exec multi-agent-frontend env | grep NEXT_PUBLIC

# Should show:
# NEXT_PUBLIC_API_URL=/api
# NEXT_PUBLIC_AUTH_SERVICE_URL=/auth

# Check browser console for errors
# Verify Nginx routing
docker exec multi-agent-nginx nginx -t
```

### Database Issues
```bash
# Check MongoDB
docker exec router-mongo mongosh --eval "db.adminCommand('ping')"

# Check Redis
docker exec router-redis redis-cli ping

# Verify network
docker network inspect multi-agent-network
```

### Nginx 502 Error
```bash
# Check backend is running
docker-compose ps

# Test backend directly
docker exec agent-router curl http://localhost:8000/health

# Check Nginx config
docker exec multi-agent-nginx nginx -T
```

### Permission Errors
```bash
# Fix volume permissions
sudo chown -R $USER:$USER agent-router/logs
sudo chown -R $USER:$USER frontend/.next
sudo chown -R $USER:$USER nginx/logs
```

## 🔐 SSL Setup

### Let's Encrypt
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Uncomment HTTPS server in nginx/conf.d/default.conf
# Restart
docker-compose restart nginx
```

### Self-Signed (Dev)
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=localhost"
```

## 🧪 Testing

### Health Check Script
```bash
#!/bin/bash
services=("http://localhost/api/health" "http://localhost/auth/health" "http://localhost")
for url in "${services[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    echo "$url: $status"
done
```

### Test API Request
```bash
# Create session
curl -X POST http://localhost/api/v1/sessions \
  -H "Content-Type: application/json"

# Send message
curl -X POST http://localhost/api/v1/route \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello", "session_id": "your-session-id"}'
```

### Test Authentication
```bash
# Register
curl -X POST http://localhost/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","full_name":"Test User"}'

# Login
curl -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📊 Monitoring

### Real-time Logs
```bash
# Follow all logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f frontend | grep ERROR

# Watch Nginx access log
tail -f nginx/logs/access.log
```

### Resource Usage
```bash
# Container stats
docker stats

# Disk usage
docker system df

# Cleanup unused resources
docker system prune -a
```

### Service Status
```bash
# Check service health
docker-compose ps

# Check specific container
docker inspect multi-agent-frontend

# Check network
docker network ls
docker network inspect multi-agent-network
```

## 🔄 Common Workflows

### Update Configuration
```bash
# 1. Edit .env
nano .env

# 2. Restart affected services
docker-compose restart agent-router

# 3. Verify
docker-compose logs -f agent-router
```

### Update Code
```bash
# 1. Pull latest code
git pull

# 2. Rebuild images
docker-compose build

# 3. Restart services
docker-compose up -d

# 4. Check logs
docker-compose logs -f
```

### Backup Data
```bash
# Backup MongoDB
docker exec router-mongo mongodump --out=/backup
docker cp router-mongo:/backup ./backup-$(date +%Y%m%d)

# Backup volumes
docker run --rm -v router-mongo-data:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/mongo-backup.tar.gz /data
```

### Restore Data
```bash
# Restore MongoDB
docker cp ./backup router-mongo:/backup
docker exec router-mongo mongorestore /backup
```

## 🚨 Emergency Procedures

### Service is Down
```bash
# 1. Check status
docker-compose ps

# 2. Check logs
docker-compose logs --tail=50 service-name

# 3. Restart service
docker-compose restart service-name

# 4. If still down, recreate
docker-compose up -d --force-recreate service-name
```

### Database Corruption
```bash
# 1. Stop services
docker-compose stop

# 2. Backup current data
docker run --rm -v router-mongo-data:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/emergency-backup.tar.gz /data

# 3. Restore from backup
# (restore commands from backup section)

# 4. Start services
docker-compose up -d
```

### Nginx Issues
```bash
# 1. Test config
docker exec multi-agent-nginx nginx -t

# 2. Reload config
docker exec multi-agent-nginx nginx -s reload

# 3. If broken, restore default
cp nginx/conf.d/default.conf.backup nginx/conf.d/default.conf
docker-compose restart nginx
```

## 📞 Getting Help

1. Check logs: `docker-compose logs -f`
2. Review documentation: `DEPLOYMENT.md`, `ARCHITECTURE.md`
3. Check issues on GitHub
4. Verify environment: `docker exec container env`
5. Test connectivity: `docker network inspect multi-agent-network`

---

## Quick Tips

💡 **Always check logs first**: `docker-compose logs -f`

💡 **Use health checks**: `curl http://localhost/api/health`

💡 **Test locally first**: Use dev mode before production

💡 **Keep secrets secure**: Never commit `.env` files

💡 **Backup regularly**: Automate database backups

💡 **Monitor resources**: Use `docker stats` to watch usage

💡 **Use descriptive commits**: Document all changes

💡 **Test before deploy**: Run health checks after deployment
