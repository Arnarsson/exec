#!/bin/bash

# 🎨 CSS Test Script for Executive Assistant MVP
# Tests Tailwind CSS compilation and styling

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🎨 Testing Executive Assistant CSS Fixes..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}🔧 Starting CSS Test...${NC}"

# Start backend in background
echo -e "${YELLOW}Starting backend server...${NC}"
cd "$PROJECT_ROOT/backend"
npm run dev &
BACKEND_PID=$!

# Wait for backend
sleep 3

# Start frontend in background  
echo -e "${YELLOW}Starting frontend with CSS test...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

# Wait for servers to start
sleep 5

echo ""
echo -e "${GREEN}🎉 CSS Test Environment Ready!${NC}"
echo "================================="
echo ""
echo -e "${GREEN}✅ Test URLs:${NC}"
echo "   🎨 CSS Test Page: http://localhost:3000?css-test=true"
echo "   🏠 Main Dashboard: http://localhost:3000"
echo "   📊 Backend API: http://localhost:3001/health"
echo ""
echo -e "${YELLOW}📋 CSS Test Checklist:${NC}"
echo "   □ Tailwind basic classes working (colors, layouts)"
echo "   □ Executive Assistant custom classes (.ea-card, .ea-button-primary)"
echo "   □ Custom theme colors (primary, secondary, etc.)"
echo "   □ Animations working (fade-in, bounce-subtle)"
echo "   □ Glass effects and custom styling"
echo ""
echo -e "${BLUE}🔍 How to Test:${NC}"
echo "   1. Open: http://localhost:3000?css-test=true"
echo "   2. Verify all styling renders correctly"
echo "   3. If CSS works: Navigate to http://localhost:3000 for full app"
echo "   4. Test navigation between Dashboard, Calendar, Email, etc."
echo ""
echo -e "${YELLOW}⚠️  If CSS doesn't work:${NC}"
echo "   • Check browser console for errors"
echo "   • Verify PostCSS is processing Tailwind"
echo "   • Check network tab for missing CSS files"
echo ""
echo "Press Ctrl+C to stop servers and exit test..."

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo -e "${RED}🛑 Stopping CSS test servers...${NC}"
    jobs -p | xargs -r kill
    exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID
