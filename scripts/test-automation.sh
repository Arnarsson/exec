#!/bin/bash

echo "🧪 Testing n8n + Executive Assistant Integration..."
echo "================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Test 1: Check if services are running
echo -e "${BLUE}🔍 Checking services...${NC}"

if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✅ Executive Assistant Backend: Running${NC}"
else
    echo -e "${RED}❌ Executive Assistant Backend: Not running${NC}"
    exit 1
fi

if curl -s http://localhost:5678/healthz > /dev/null; then
    echo -e "${GREEN}✅ n8n: Running${NC}"
else
    echo -e "${RED}❌ n8n: Not running${NC}"
    exit 1
fi

# Test 2: Test automation status endpoint
echo -e "${BLUE}🔍 Testing automation status...${NC}"
STATUS=$(curl -s http://localhost:3001/api/automation/status)
echo "Status response: $STATUS"

# Test 3: Test email intelligence workflow
echo -e "${BLUE}📧 Testing Email Intelligence workflow...${NC}"
EMAIL_RESPONSE=$(curl -s -X POST http://localhost:5678/webhook/email-intelligence \
  -H "Content-Type: application/json" \
  -d '{
    "email_id": "test_001",
    "sender": "john.doe@example.com",
    "subject": "Urgent: Project Meeting Tomorrow",
    "content": "Hi, we need to schedule an urgent meeting tomorrow at 2 PM to discuss the Q4 project deliverables. Please review the attached documents and come prepared with your status updates. This is critical for our deadline."
  }')

echo "Email workflow response: $EMAIL_RESPONSE"

# Test 4: Test calendar prep workflow trigger
echo -e "${BLUE}📅 Testing Calendar Prep workflow trigger...${NC}"
CALENDAR_RESPONSE=$(curl -s -X POST http://localhost:3001/api/automation/trigger/calendar-prep \
  -H "Content-Type: application/json" \
  -d '{
    "test": true,
    "date": "'$(date +%Y-%m-%d)'"
  }')

echo "Calendar prep response: $CALENDAR_RESPONSE"

# Test 5: Test task automation workflow
echo -e "${BLUE}✅ Testing Task Automation workflow...${NC}"
TASK_RESPONSE=$(curl -s -X POST http://localhost:5678/webhook/task-automation \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {"title": "Review project proposal", "description": "High priority review needed"},
      {"title": "Prepare presentation", "description": "For client meeting next week"},
      {"title": "Update team status", "description": "Weekly team synchronization"}
    ],
    "context": "weekly_planning"
  }')

echo "Task automation response: $TASK_RESPONSE"

echo ""
echo -e "${GREEN}🎉 All tests completed!${NC}"
echo "Check the Executive Assistant dashboard for real-time updates."