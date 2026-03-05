#!/bin/bash
set -e

echo "================================================"
echo "Starting Multi-Agent System in Development Mode"
echo "================================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Creating from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env and set your API keys, then run this script again."
    exit 1
fi

# Create network
echo "🌐 Creating Docker network..."
docker network create multi-agent-network 2>/dev/null || echo "✓ Network already exists"
echo ""

# Stop any running services
echo "🛑 Stopping any running services..."
docker compose down 2>/dev/null || true
echo ""

# Build images
echo "🏗️  Building Docker images..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml build
echo ""

# Start services
echo "🚀 Starting services in development mode..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
echo ""

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 15

# Check service health
echo ""
echo "🏥 Checking service health..."

check_service() {
    local name=$1
    local url=$2
    local max_retries=10
    local retry=0

    while [ $retry -lt $max_retries ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo "✅ $name is healthy"
            return 0
        fi
        retry=$((retry + 1))
        sleep 2
    done

    echo "⚠️  $name is not responding (may still be starting)"
    return 1
}

check_service "Agent Router" "http://localhost:8000/health" || true
check_service "Auth Service" "http://localhost:8001/health" || true
check_service "Frontend" "http://localhost:3000" || true

echo ""
echo "================================================"
echo "✅ Development environment started!"
echo "================================================"
echo ""
echo "🌐 Service URLs:"
echo "   Frontend:        http://localhost:3000"
echo "   Agent Router:    http://localhost:8000"
echo "   Auth Service:    http://localhost:8001"
echo "   Router API Docs: http://localhost:8000/docs"
echo "   Auth API Docs:   http://localhost:8001/docs"
echo ""
echo "📊 Database URLs (for external tools):"
echo "   MongoDB (Router):  mongodb://localhost:27017"
echo "   MongoDB (Auth):    mongodb://localhost:27018"
echo "   MongoDB (Secrets): mongodb://localhost:27019"
echo "   Redis:             redis://localhost:6380"
echo ""
echo "📋 Useful commands:"
echo "   View logs:        docker compose logs -f"
echo "   Stop services:    docker compose down"
echo "   Restart service:  docker compose restart <service-name>"
echo ""
echo "🔍 Troubleshooting:"
echo "   Check status:     docker compose ps"
echo "   Check logs:       docker compose logs -f auth-service"
echo "   Shell into container: docker exec -it auth-service bash"
echo ""

# Show running containers
echo "📦 Running containers:"
docker compose ps
echo ""

# Check if ports are accessible
echo "🔌 Port check:"
for port in 3000 8000 8001; do
    if nc -z localhost $port 2>/dev/null; then
        echo "✅ Port $port is accessible"
    else
        echo "❌ Port $port is NOT accessible - check if service is running"
        echo "   Run: docker compose logs -f | grep $port"
    fi
done

echo ""
echo "================================================"
