#!/bin/bash

# 🚀 Executive Assistant MVP - Development Server Script
# Starts both backend and frontend in development mode

set -e

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Starting Executive Assistant MVP Development Servers..."
echo "========================================================"

# Check if setup has been run
if [ ! -f "backend/.env" ] || [ ! -f "frontend/.env" ]; then
    echo "⚠️  Environment files not found. Running setup first..."
    ./scripts/setup.sh
fi

# Check if dependencies are installed
if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo "⚠️  Dependencies not found. Running setup first..."
    ./scripts/setup.sh
fi

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down development servers..."
    jobs -p | xargs -r kill
    exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}🔧 Starting Backend Server (AG-UI + WebSocket)...${NC}"
echo "================================================"

# Start backend in background
cd "$PROJECT_ROOT/backend"
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

echo ""
echo -e "${GREEN}🎨 Starting Frontend Development Server...${NC}"
echo "==========================================="

# Start frontend in background
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

# Wait a moment for servers to stabilize
sleep 5

echo ""
echo "🎉 Development Environment Ready!"
echo "================================="
echo ""
echo -e "${GREEN}✅ Backend Server:${NC}"
echo "   📍 API: http://localhost:3001"
echo "   🔌 WebSocket: ws://localhost:8080"
echo "   💓 Health: http://localhost:3001/health"
echo ""
echo -e "${GREEN}✅ Frontend Application:${NC}"
echo "   🌐 Dashboard: http://localhost:3000"
echo "   🎨 Development: http://localhost:5173 (if using Vite)"
echo ""
echo -e "${YELLOW}📚 Available Features:${NC}"
echo "   📊 Executive Dashboard with real-time metrics"
echo "   📅 Calendar management and scheduling"
echo "   📧 Email interface with AI summarization"
echo "   📋 Task management with Kanban views"
echo "   💬 AI Chat with AG-UI streaming"
echo "   ⚙️  Settings and integration management"
echo ""
echo -e "${BLUE}🔧 Development Tools:${NC}"
echo "   • Hot reload enabled for both servers"
echo "   • TypeScript compilation in watch mode"
echo "   • AG-UI events visible in browser console"
echo "   • WebSocket connection status in UI"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "   • Use Ctrl+C to stop both servers"
echo "   • Check browser console for AG-UI events"
echo "   • Configure API keys in .env files for full functionality"
echo "   • WebSocket events stream in real-time"
echo ""
echo "📝 Logs will appear below as you use the application..."
echo "======================================================"
echo ""

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID
