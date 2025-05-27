#!/bin/bash

# 🔗 Executive Assistant + n8n Integration Setup
# Installs n8n alongside the Executive Assistant MVP

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔗 Setting up n8n Integration with Executive Assistant..."
echo "========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}📦 Installing n8n...${NC}"

# Install n8n globally
npm install -g n8n

echo ""
echo -e "${GREEN}✅ n8n installed successfully${NC}"

# Create n8n configuration directory
mkdir -p "$PROJECT_ROOT/n8n"
cd "$PROJECT_ROOT/n8n"

# Create n8n environment configuration
cat > .env << 'EOF'
# n8n Configuration for Executive Assistant Integration
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=executive123

# Database (using file-based for simplicity)
DB_TYPE=sqlite
DB_SQLITE_DATABASE=database.sqlite

# Webhook settings
WEBHOOK_URL=http://localhost:5678/
N8N_PORT=5678

# Executive Assistant API integration
EXECUTIVE_ASSISTANT_API=http://localhost:3001
EXECUTIVE_ASSISTANT_WS=ws://localhost:8080

# Security
N8N_ENCRYPTION_KEY=executive-assistant-n8n-key-2025

# Timezone
GENERIC_TIMEZONE=Europe/Copenhagen
EOF

echo -e "${GREEN}✅ n8n configuration created${NC}"

# Create startup script for integrated environment
cat > ../scripts/start-with-n8n.sh << 'EOF'
#!/bin/bash

# 🚀 Start Executive Assistant + n8n Integration
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Starting Executive Assistant + n8n Integration..."
echo "==================================================="

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down integrated environment..."
    jobs -p | xargs -r kill
    exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🔧 Starting Executive Assistant Backend...${NC}"
cd "$PROJECT_ROOT/backend"
npm run dev &
BACKEND_PID=$!

sleep 3

echo ""
echo -e "${BLUE}🎨 Starting Executive Assistant Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

sleep 3

echo ""
echo -e "${YELLOW}🔗 Starting n8n Workflow Engine...${NC}"
cd "$PROJECT_ROOT/n8n"
n8n start &
N8N_PID=$!

sleep 5

echo ""
echo "🎉 Integrated Environment Ready!"
echo "================================="
echo ""
echo -e "${GREEN}✅ Executive Assistant:${NC}"
echo "   🌐 Dashboard: http://localhost:3000"
echo "   📍 API: http://localhost:3001"
echo "   🔌 WebSocket: ws://localhost:8080"
echo ""
echo -e "${GREEN}✅ n8n Workflow Engine:${NC}"
echo "   🎛️  Interface: http://localhost:5678"
echo "   👤 Username: admin"
echo "   🔑 Password: executive123"
echo ""
echo -e "${YELLOW}🔧 Integration Features:${NC}"
echo "   📧 Email automation workflows"
echo "   📅 Calendar intelligence"
echo "   📋 Task management automation"
echo "   📊 Data aggregation pipelines"
echo ""
echo "📝 Check logs for workflow execution details..."
echo "=============================================="

# Wait for all processes
wait $BACKEND_PID $FRONTEND_PID $N8N_PID
EOF

chmod +x ../scripts/start-with-n8n.sh

echo ""
echo -e "${GREEN}✅ Integration startup script created${NC}"

echo ""
echo "🎉 n8n Integration Setup Complete!"
echo "==================================="
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Start integrated environment: ./scripts/start-with-n8n.sh"
echo "2. Access n8n: http://localhost:5678 (admin / executive123)"
echo "3. Import Executive Assistant workflows"
echo "4. Configure automation triggers"
echo ""
echo -e "${BLUE}🔧 Available Integrations:${NC}"
echo "• Email processing and summarization"
echo "• Calendar event automation"
echo "• Task creation from multiple sources"
echo "• Data aggregation workflows"
echo "• Decision support automation"
