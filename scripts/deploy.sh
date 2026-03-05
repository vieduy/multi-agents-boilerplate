#!/bin/bash
set -e

# Multi-Agent System Deployment Script
# Usage: ./scripts/deploy.sh [prod|dev]

MODE=${1:-prod}
ENV_FILE=".env"

echo "================================================"
echo "Multi-Agent System Deployment Script"
echo "================================================"
echo "Mode: $MODE"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your configuration:"
    echo "   - Set OPENAI_API_KEY"
    echo "   - Change JWT_SECRET_KEY and AUTH_JWT_SECRET_KEY"
    echo ""
    echo "After updating .env, run this script again."
    exit 0
fi

# Validate required environment variables
echo "🔍 Validating environment variables..."
source "$ENV_FILE"

MISSING_VARS=()

if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "sk-your-openai-api-key-here" ]; then
    MISSING_VARS+=("OPENAI_API_KEY")
fi

if [ "$JWT_SECRET_KEY" = "change-this-secret-key-in-production-min-32-chars-long" ]; then
    MISSING_VARS+=("JWT_SECRET_KEY")
fi

if [ "$AUTH_JWT_SECRET_KEY" = "change-this-secret-key-in-production-min-32-chars-long" ]; then
    MISSING_VARS+=("AUTH_JWT_SECRET_KEY")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ Missing or default values found for required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please update .env file with proper values."
    exit 1
fi

echo "✅ Environment variables validated"
echo ""

# Create Docker network if it doesn't exist
echo "🌐 Creating Docker network..."
docker network create multi-agent-network 2>/dev/null || echo "Network already exists"
echo ""

# Build images
echo "🏗️  Building Docker images..."
if [ "$MODE" = "dev" ]; then
    docker compose -f docker-compose.yml -f docker-compose.dev.yml build
else
    docker compose build
fi
echo "✅ Images built successfully"
echo ""

# Start services
echo "🚀 Starting services..."
if [ "$MODE" = "dev" ]; then
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
else
    docker compose up -d
fi
echo ""

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "🏥 Checking service health..."

check_health() {
    local name=$1
    local url=$2
    local max_retries=30
    local retry=0

    while [ $retry -lt $max_retries ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo "✅ $name is healthy"
            return 0
        fi
        retry=$((retry + 1))
        sleep 2
    done

    echo "❌ $name health check failed"
    return 1
}

if [ "$MODE" = "dev" ]; then
    check_health "Agent Router" "http://localhost:8000/health"
    check_health "Auth Service" "http://localhost:8001/health"
    check_health "Frontend" "http://localhost:3000/api/health"
else
    check_health "Nginx (API)" "http://localhost/api/health"
    check_health "Nginx (Auth)" "http://localhost/auth/health"
    check_health "Nginx (Frontend)" "http://localhost"
fi

echo ""
echo "================================================"
echo "✅ Deployment completed successfully!"
echo "================================================"
echo ""

if [ "$MODE" = "dev" ]; then
    echo "🌐 Development URLs:"
    echo "   Frontend:      http://localhost:3000"
    echo "   Agent Router:  http://localhost:8000"
    echo "   Auth Service:  http://localhost:8001"
    echo ""
    echo "📊 Database URLs:"
    echo "   MongoDB (Router):  mongodb://localhost:27017"
    echo "   MongoDB (Auth):    mongodb://localhost:27018"
    echo "   MongoDB (Secrets): mongodb://localhost:27019"
    echo "   Redis:             redis://localhost:6379"
else
    echo "🌐 Production URLs:"
    echo "   Application:   http://localhost"
    echo "   API:           http://localhost/api"
    echo "   Auth:          http://localhost/auth"
fi

echo ""
echo "📋 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:       docker-compose restart"
echo "   View status:   docker-compose ps"
echo ""
