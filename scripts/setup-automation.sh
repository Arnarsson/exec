#!/bin/bash

# 🎉 Complete n8n + Executive Assistant Integration Setup
# This script finalizes the entire automation setup

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🎉 FINALIZING n8n + EXECUTIVE ASSISTANT INTEGRATION"
echo "==================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🔧 Making scripts executable...${NC}"

# Make all scripts executable
chmod +x scripts/*.sh
chmod +x automation/n8n/.env 2>/dev/null || true

echo ""
echo -e "${BLUE}📊 Verifying project structure...${NC}"

# Verify all components exist
COMPONENTS=(
    "automation/n8n/docker-compose.yml"
    "automation/n8n/.env"
    "automation/n8n/workflows/01_email_intelligence.json"
    "automation/n8n/workflows/02_calendar_prep.json"
    "automation/n8n/workflows/03_task_automation.json"
    "backend/src/services/AutomationService.ts"
    "backend/src/routes/automation.ts"
    "frontend/src/components/automation/AutomationDashboard.tsx"
    "scripts/start-with-automation.sh"
    "scripts/test-automation.sh"
)

ALL_GOOD=true
for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ] || [ -d "$component" ]; then
        echo -e "${GREEN}✅ $component${NC}"
    else
        echo -e "${RED}❌ $component${NC}"
        ALL_GOOD=false
    fi
done

if [ "$ALL_GOOD" = false ]; then
    echo -e "${RED}❌ Some components are missing. Please check the setup.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: OpenAI API Key Configuration${NC}"
echo ""
echo "Before starting, you MUST add your OpenAI API key to:"
echo "📁 automation/n8n/.env"
echo ""
echo "Edit the file and replace 'your_openai_api_key_here' with your actual API key."
echo ""

# Check if API key is configured
if grep -q "your_openai_api_key_here" automation/n8n/.env 2>/dev/null; then
    echo -e "${RED}⚠️  OpenAI API key not configured yet!${NC}"
    echo ""
    read -p "Do you want to configure it now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Opening the environment file for editing..."
        echo "Replace 'your_openai_api_key_here' with your actual OpenAI API key"
        echo "Save and close the file when done."
        echo ""
        read -p "Press Enter to open the file..."
        nano automation/n8n/.env || vi automation/n8n/.env || echo "Please edit automation/n8n/.env manually"
    fi
fi

echo ""
echo "🎉 SETUP COMPLETE!"
echo "=================="
echo ""
echo -e "${GREEN}🚀 Ready to start your automation-powered Executive Assistant!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1. ${BLUE}Start the integrated system:${NC}"
echo "   ./scripts/start-with-automation.sh"
echo ""
echo "2. ${BLUE}Configure n8n workflows:${NC}"
echo "   • Open: http://localhost:5678"
echo "   • Login: admin / ExecutiveAssistant2025!"
echo "   • Import workflows from automation/n8n/workflows/"
echo "   • Configure OpenAI credentials in n8n"
echo ""
echo "3. ${BLUE}Test the integration:${NC}"
echo "   ./scripts/test-automation.sh"
echo ""
echo "4. ${BLUE}Access your Executive Assistant:${NC}"
echo "   • Dashboard: http://localhost:3000"
echo "   • API: http://localhost:3001"
echo "   • n8n Interface: http://localhost:5678"
echo ""
echo -e "${GREEN}✨ What you'll get:${NC}"
echo "• 📧 AI-powered email intelligence and task creation"
echo "• 📅 Smart calendar preparation with meeting briefs"
echo "• ✅ Intelligent task automation and optimization"
echo "• 📊 Real-time dashboard updates via WebSocket"
echo "• 🤖 Professional workflow orchestration"
echo ""
echo -e "${BLUE}🆘 Need help?${NC}"
echo "• Check logs in automation/logs/"
echo "• Run ./scripts/test-automation.sh for diagnostics"
echo "• All configuration files are ready to customize"
echo ""
echo "Your Executive Assistant is now a powerful automation hub! 🚀"