# 🤖 Executive Assistant + n8n Automation Integration

## 🎯 Overview

Your Executive Assistant MVP now includes powerful **n8n automation workflows** that add:

- 🧠 **AI-powered email intelligence** and auto-triage
- 📅 **Smart calendar preparation** with automated briefings
- ✅ **Intelligent task management** and optimization
- 🔄 **Real-time dashboard updates** via WebSocket
- 🎛️ **Professional workflow orchestration**

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                Executive Assistant MVP                   │
├─────────────────────┬───────────────────────────────────┤
│     Frontend        │           Backend                 │
│  (React + Vite)     │      (Node.js + Express)         │
│  Port: 3000         │         Port: 3001                │
│                     │      WebSocket: 8080              │
├─────────────────────┴───────────────────────────────────┤
│                n8n Automation Engine                    │
│                    Port: 5678                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Email Intelligence │ Calendar Prep │ Task Automation │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Complete Setup
```bash
# Run the comprehensive setup script
chmod +x scripts/complete-setup.sh
./scripts/complete-setup.sh
```

### 2. Start Integrated Environment
```bash
# Start all services (EA + n8n)
./scripts/start-with-automation.sh
```

### 3. Configure n8n Workflows
1. Open http://localhost:5678
2. Login: `admin` / `ExecutiveAssistant2025!`
3. Go to **Settings** → **Import** 
4. Import these workflows:
   - `automation/n8n/workflows/01_email_intelligence.json`
   - `automation/n8n/workflows/02_calendar_prep.json`
   - `automation/n8n/workflows/03_task_automation.json`

### 4. Test Automation
```bash
# Run comprehensive tests
./scripts/test-automation.sh
```

## 🎛️ Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Executive Assistant** | http://localhost:3000 | - |
| **n8n Automation** | http://localhost:5678 | admin / ExecutiveAssistant2025! |
| **Backend API** | http://localhost:3001 | - |
| **WebSocket** | ws://localhost:8080 | - |

## 🤖 Automation Workflows

### 📧 Email Intelligence Workflow
- **Trigger**: POST webhook `/webhook/email-intelligence`
- **Features**:
  - AI-powered email analysis
  - Priority scoring (1-5)
  - Action item extraction
  - Sentiment analysis
  - Meeting request detection
  - Deadline identification

**Test Example**:
```bash
curl -X POST http://localhost:5678/webhook/email-intelligence \
  -H "Content-Type: application/json" \
  -d '{
    "email_id": "test_001",
    "sender": "john.doe@example.com",
    "subject": "Urgent: Project Meeting Tomorrow",
    "content": "Hi, we need to schedule an urgent meeting tomorrow at 2 PM..."
  }'
```

### 📅 Calendar Preparation Workflow
- **Trigger**: Daily at 8:00 AM (Cron)
- **Features**:
  - Fetches today's meetings
  - Generates preparation materials
  - Creates briefing notes
  - Identifies required documents
  - Suggests talking points

### ✅ Task Automation Workflow
- **Trigger**: POST webhook `/webhook/task-automation`
- **Features**:
  - Task optimization and prioritization
  - Duration estimation
  - Dependency analysis
  - Category assignment
  - Priority adjustments with reasoning

## 🔧 Configuration

### Environment Variables

Edit `automation/n8n/.env`:

```env
# REQUIRED: Add your OpenAI API key
OPENAI_API_KEY=your_actual_api_key_here

# Optional: Additional integrations
ANTHROPIC_API_KEY=your_anthropic_key
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
```

### Backend Integration

The automation service is already integrated into your backend:

- **AutomationService**: Handles workflow processing
- **Automation Routes**: API endpoints for n8n integration
- **WebSocket Broadcasting**: Real-time updates to frontend

### Frontend Dashboard

The AutomationDashboard component provides:

- Real-time automation status
- Workflow execution metrics
- Quick action buttons
- Success/failure rates
- Connection monitoring

## 📊 Monitoring & Metrics

### Dashboard Metrics
- Emails processed today
- Tasks created today
- Meetings prepared today
- Automation success rate
- Active workflow count

### Logs & Debugging
- **Backend logs**: Check terminal output
- **n8n logs**: Available in Docker container
- **Workflow execution**: Visible in n8n interface
- **WebSocket events**: Real-time in frontend

## 🔄 API Endpoints

### Automation Status
```bash
GET /api/automation/status
```

### Manual Workflow Trigger
```bash
POST /api/automation/trigger/:workflow
```

### n8n Webhook (Internal)
```bash
POST /api/automation/webhook/n8n
```

## 🛠️ Troubleshooting

### Common Issues

**1. n8n not starting**
```bash
# Check Docker status
docker info

# Restart Docker Desktop
# On macOS: Restart Docker Desktop app
```

**2. Port conflicts**
```bash
# Check what's using ports
lsof -i :3000 :3001 :5678 :8080

# Kill conflicting processes
kill -9 <PID>
```

**3. OpenAI API errors**
```bash
# Verify API key in automation/n8n/.env
grep OPENAI_API_KEY automation/n8n/.env

# Test API key manually
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.openai.com/v1/models
```

**4. Workflow import issues**
- Import JSON files directly (don't copy-paste)
- Ensure OpenAI credentials are configured in n8n
- Check webhook URLs are correct
- Verify backend is running before importing

**5. Backend connection issues**
```bash
# Check backend health
curl http://localhost:3001/health

# Check automation service
curl http://localhost:3001/api/automation/status
```

### Debug Commands

```bash
# Check all services
./scripts/test-automation.sh

# View Docker logs
docker-compose -f automation/n8n/docker-compose.yml logs -f

# Check automation status
curl -s http://localhost:3001/api/automation/status | jq

# Test manual trigger
curl -X POST http://localhost:3001/api/automation/trigger/email-intelligence \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## 🔐 Security Notes

- Change default n8n password in production
- Use environment variables for API keys
- Enable HTTPS in production
- Restrict webhook access if needed
- Monitor automation logs regularly

## 🎯 Next Steps

1. **Add More Workflows**: Create custom automation workflows
2. **Email Integration**: Connect real email providers
3. **Calendar Integration**: Connect Google Calendar/Outlook
4. **Database Persistence**: Add workflow execution history
5. **Monitoring**: Set up comprehensive logging
6. **Production**: Deploy with proper security measures

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review logs for error messages
3. Test individual components
4. Verify configuration files

---

**🎉 Congratulations!** Your Executive Assistant now has powerful automation capabilities that will transform your productivity workflow!
