#!/bin/bash

# Auth Service Quick Start Script

echo "==================================="
echo "Authentication Service Quick Start"
echo "==================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q -r requirements.txt

# Check if .env exists, if not copy from example
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and update JWT_SECRET_KEY before running in production!"
fi

# Check if MongoDB is running
echo "Checking MongoDB connection..."
if mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
    echo "✓ MongoDB is running"
else
    echo "⚠️  MongoDB is not running. Starting with Docker..."
    docker run -d -p 27017:27017 --name auth-mongodb mongo:7 2>/dev/null || docker start auth-mongodb
    sleep 3
fi

# Start the service
echo ""
echo "Starting Authentication Service..."
echo "Service will be available at: http://localhost:8001"
echo "API Documentation: http://localhost:8001/docs"
echo ""

cd src
python -m auth_service.main
