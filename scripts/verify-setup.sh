#!/bin/bash

# 🔍 AUTOMATION INTEGRATION VERIFICATION CHECKLIST
# Verifies that all components are properly set up

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

PASSED=0
TOTAL=0

check_item() {
    ((TOTAL++))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

echo -e "${PURPLE}🔍 EXECUTIVE ASSISTANT + n8n INTEGRATION VERIFICATION${NC}"
echo "=================================================="
echo ""

echo -e "${BLUE}📁 File Structure Verification${NC}"
echo "----------------------------------------"

# Check directory structure
[ -d "automation/n8n" ] && check_item 0 "automation/n8n directory exists" || check_item 1 "automation/n8n directory exists"
[ -d "automation/n8n/workflows" ] && check_item 0 "workflows directory exists" || check_item 1 "workflows directory exists"
[ -d "automation/n8n/credentials" ] && check_item 0 "credentials directory exists" || check_item 1 "credentials directory exists"
[ -d "automation/logs" ] && check_item 0 "logs directory exists" || check_item 1 "logs directory exists"

echo ""
echo -e "${BLUE}📄 Configuration Files${NC}"
echo "----------------------------------------"

# Check essential files
[ -f "automation/n8n/docker-compose.yml" ] && check_item 0 "docker-compose.yml exists" || check_item 1 "docker-compose.yml exists"
[ -f "automation/n8n/.env" ] && check_item 0 ".env file exists" || check_item 1 ".env file exists"

# Check workflows
[ -f "automation/n8n/workflows/01_email_intelligence.json" ] && check_item 0 "Email Intelligence workflow exists" || check_item 1 "Email Intelligence workflow exists"
[ -f "automation/n8n/workflows/02_calendar_prep.json" ] && check_item 0 "Calendar Prep workflow exists" || check_item 1 "Calendar Prep workflow exists"
[ -f "automation/n8n/workflows/03_task_automation.json" ] && check_item 0 "Task Automation workflow exists" || check_item 1 "Task Automation workflow exists"

echo ""
echo -e "${BLUE}🔧 Backend Integration${NC}"
echo "----------------------------------------"

# Check backend files
[ -f "backend/src/services/AutomationService.ts" ] && check_item 0 "AutomationService exists" || check_item 1 "AutomationService exists"
[ -f "backend/src/routes/automation.ts" ] && check_item 0 "Automation routes exist" || check_item 1 "Automation routes exist"

# Check if automation is imported in main app
if grep -q "AutomationService" "backend/src/index.ts"; then
    check_item 0 "AutomationService imported in main app"
else
    check_item 1 "AutomationService imported in main app"
fi

echo ""
echo -e "${BLUE}🎨 Frontend Integration${NC}"
echo "----------------------------------------"

# Check frontend components
[ -f "frontend/src/components/automation/AutomationDashboard.tsx" ] && check_item 0 "AutomationDashboard component exists" || check_item 1 "AutomationDashboard component exists"

echo ""
echo -e "${BLUE}📜 Scripts & Documentation${NC}"
echo "----------------------------------------"

# Check scripts
[ -f "scripts/start-with-automation.sh" ] && check_item 0 "Startup script exists" || check_item 1 "Startup script exists"
[ -f "scripts/test-automation.sh" ] && check_item 0 "Test script exists" || check_item 1 "Test script exists"
[ -f "scripts/complete-setup.sh" ] && check_item 0 "Setup script exists" || check_item 1 "Setup script exists"
[ -f "AUTOMATION_README.md" ] && check_item 0 "Automation documentation exists" || check_item 1 "Automation documentation exists"

# Check if scripts are executable
[ -x "scripts/start-with-automation.sh" ] && check_item 0 "Startup script is executable" || check_item 1 "Startup script is executable"
[ -x "scripts/test-automation.sh" ] && check_item 0 "Test script is executable" || check_item 1 "Test script is executable"

echo ""
echo -e "${BLUE}🔑 Configuration Verification${NC}"
echo "----------------------------------------"

# Check OpenAI API key configuration
if grep -q "your_openai_api_key_here" automation/n8n/.env 2>/dev/null; then
    check_item 1 "OpenAI API key configured (still placeholder)"
else
    check_item 0 "OpenAI API key configured"
fi

# Check Docker configuration
if grep -q "executive-assistant-n8n" automation/n8n/docker-compose.yml 2>/dev/null; then
    check_item 0 "Docker container properly named"
else
    check_item 1 "Docker container properly named"
fi

echo ""
echo -e "${BLUE}🐳 Docker Environment${NC}"
echo "----------------------------------------"

# Check if Docker is available
if command -v docker >/dev/null 2>&1; then
    check_item 0 "Docker is installed"
else
    check_item 1 "Docker is installed"
fi

if command -v docker-compose >/dev/null 2>&1; then
    check_item 0 "Docker Compose is installed"
else
    check_item 1 "Docker Compose is installed"
fi

echo ""
echo "=============================================="
echo -e "${PURPLE}📊 VERIFICATION SUMMARY${NC}"
echo "=============================================="
echo ""

PERCENTAGE=$((PASSED * 100 / TOTAL))

if [ $PERCENTAGE -eq 100 ]; then
    echo -e "${GREEN}🎉 PERFECT! All checks passed (${PASSED}/${TOTAL})${NC}"
    echo ""
    echo -e "${GREEN}✨ Your Executive Assistant + n8n integration is ready!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. ./scripts/complete-setup.sh   # Final setup"
    echo "2. ./scripts/start-with-automation.sh   # Start services"
    echo "3. Configure workflows in n8n interface"
    echo "4. ./scripts/test-automation.sh   # Test everything"
elif [ $PERCENTAGE -ge 80 ]; then
    echo -e "${YELLOW}⚠️  MOSTLY READY: ${PASSED}/${TOTAL} checks passed (${PERCENTAGE}%)${NC}"
    echo ""
    echo -e "${YELLOW}Please address the failed checks above before proceeding.${NC}"
elif [ $PERCENTAGE -ge 60 ]; then
    echo -e "${RED}⚠️  NEEDS WORK: ${PASSED}/${TOTAL} checks passed (${PERCENTAGE}%)${NC}"
    echo ""
    echo -e "${RED}Several issues need to be resolved. Check the failed items above.${NC}"
else
    echo -e "${RED}❌ SETUP INCOMPLETE: ${PASSED}/${TOTAL} checks passed (${PERCENTAGE}%)${NC}"
    echo ""
    echo -e "${RED}Major setup issues detected. Please review the installation guide.${NC}"
fi

echo ""
echo -e "${BLUE}📖 For detailed help, see: AUTOMATION_README.md${NC}"
