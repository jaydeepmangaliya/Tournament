#!/usr/bin/env bash
# ==============================================================================
# LocalEsport 1-Click Deployment & Continuous Update Script
# Usage on server: ./deploy.sh
# ==============================================================================

set -e

echo ""
echo "=========================================================="
echo "🚀 LocalEsport 1-Click Production Deployment"
echo "=========================================================="
echo ""

# 1. Pull latest code from GitHub main branch
echo "📥 1/4: Pulling latest changes from Git repository (main)..."
git pull origin main

# 2. Check environment configuration
echo "⚙️  2/4: Checking production environment configuration..."
if [ ! -f "BE/.env" ]; then
    if [ -f "BE/.env.example" ]; then
        echo "⚠️  BE/.env not found! Generating template from BE/.env.example..."
        cp BE/.env.example BE/.env
        echo "👉 Please update BE/.env with your AWS RDS and Razorpay credentials, then rerun ./deploy.sh"
        exit 1
    else
        echo "❌ Error: BE/.env is missing. Please create it before deploying."
        exit 1
    fi
fi

# 3. Build & restart Docker container
echo "🐳 3/4: Building and restarting Docker containers..."
if command -v docker-compose &> /dev/null; then
    docker-compose down --remove-orphans || true
    docker-compose up -d --build
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    docker compose down --remove-orphans || true
    docker compose up -d --build
else
    echo "❌ Error: Docker or Docker Compose is not installed on this system."
    exit 1
fi

# 4. Status Check
echo "🔍 4/4: Waiting for container to boot up..."
sleep 4

if command -v docker-compose &> /dev/null; then
    docker-compose ps
else
    docker compose ps
fi

echo ""
echo "=========================================================="
echo "✅ LocalEsport is LIVE and running on port 2000!"
echo "🌐 Access your platform at: http://YOUR_SERVER_IP:2000"
echo "=========================================================="
echo ""

