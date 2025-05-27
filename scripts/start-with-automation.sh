#!/bin/bash

# 🚀 Start Executive Assistant + n8n Automation
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Starting Executive Assistant + n8n Automation..."
echo "=================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to handle cleanup
cleanup() {
    echo ""
    echo -e "${RED}🛑 Shutting down integrated environment...${NC}"
    jobs -p | xargs -r kill
    cd "$PROJECT_ROOT/automation/n8n"
    docker-compose down
    exit 0
}

trap cleanup SIGINT SIGTERM

# 1. Start n8n first
echo -e "${BLUE}🔧 Starting n8n Automation Engine...${NC}"
cd "$PROJECT_ROOT/automation/n8n"
docker-compose up -d

# Wait for n8n to be ready
echo -e "${YELLOW}⏳ Waiting for n8n to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:5678/healthz > /dev/null 2>&1; then
        echo -e "${GREEN}✅ n8n is running${NC}"
        break
    fi
    sleep 2
done

# 2. Start Executive Assistant backend
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
    sleep 2
done

# 3. Start frontend
echo -e "${BLUE}🎨 Starting Executive Assistant Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

sleep 5

echo ""
echo "🎉 INTEGRATED ENVIRONMENT READY!"
echo "================================="
echo ""
echo -e "${GREEN}✅ Executive Assistant:${NC}"
echo "   🌐 Dashboard: http://localhost:3000"
echo "   📍 API: http://localhost:3001"
echo "   🔌 WebSocket: ws://localhost:8080"
echo ""
echo -e "${GREEN}✅ n8n Automation Engine:${NC}"
echo "   🎛️  Interface: http://localhost:5678"
echo "   👤 Username: admin"
echo "   🔑 Password: ExecutiveAssistant2025!"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "   1. Import workflows in n8n interface"
echo "   2. Configure your OpenAI API key"
echo "   3. Test automation workflows"
echo ""
echo "Press Ctrl+C to stop all services"
echo "=================================="

# Wait for all processes
wait $BACKEND_PID $FRONTEND_PID