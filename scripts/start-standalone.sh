#!/bin/bash

# 🚀 Start Executive Assistant (without n8n automation)
# Use this when Docker is not available

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Starting Executive Assistant (Standalone Mode)..."
echo "================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to handle cleanup
cleanup() {
    echo ""
    echo -e "${RED}🛑 Shutting down Executive Assistant...${NC}"
    jobs -p | xargs -r kill
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null; then
        echo -e "${YELLOW}⚠️  Port $1 is already in use${NC}"
        return 1
    else
        return 0
    fi
}

# Check required ports
echo -e "${BLUE}🔍 Checking port availability...${NC}"
check_port 3000 || echo "Frontend port 3000 may conflict"
check_port 3001 || echo "Backend port 3001 may conflict"  
check_port 8080 || echo "WebSocket port 8080 may conflict"

# Start Executive Assistant backend
echo -e "${BLUE}🔧 Starting Executive Assistant Backend...${NC}"
cd "$PROJECT_ROOT/backend"
npm run dev &
BACKEND_PID=$!

# Wait for backend
echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is running${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        exit 1
    fi
    sleep 2
done

# Start frontend
echo -e "${BLUE}🎨 Starting Executive Assistant Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

# Wait a moment for frontend to initialize
sleep 5

echo ""
echo "🎉 EXECUTIVE ASSISTANT READY!"
echo "============================="
echo ""
echo -e "${GREEN}✅ Executive Assistant (Standalone):${NC}"
echo "   🌐 Dashboard: http://localhost:3000"
echo "   📍 API: http://localhost:3001"
echo "   🔌 WebSocket: ws://localhost:8080"
echo ""
echo -e "${YELLOW}📋 Current Mode: Standalone (without n8n automation)${NC}"
echo ""
echo -e "${BLUE}To add automation later:${NC}"
echo "   1. Start Docker Desktop"
echo "   2. Stop this (Ctrl+C)"
echo "   3. Run: ./scripts/start-with-automation.sh"
echo ""
echo "Press Ctrl+C to stop all services"
echo "=================================="

# Wait for all processes
wait $BACKEND_PID $FRONTEND_PID
