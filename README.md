# Perfect Executive Assistant

An AI-powered executive assistant with real-time streaming chat, calendar integration, email management, and task tracking. Built with a Swiss design system aesthetic.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue.svg)

## Features

- **Dashboard** - Executive overview with meetings, tasks, communications, and velocity metrics
- **Calendar Integration** - Google Calendar sync with event management and scheduling
- **Email Management** - Gmail integration with inbox, search, and email details
- **AI Chat Interface** - Command interface powered by AG-UI protocol
- **Task Management** - Track and manage priorities and projects
- **Dark Mode** - Full dark/light theme support with localStorage persistence
- **Mobile Responsive** - Optimized for desktop, tablet, and mobile devices

## Screenshots

| Light Mode | Dark Mode |
|------------|-----------|
| Swiss design with clean typography | Full dark theme support |

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Swiss design system (CSS variables)
- **State**: React Context (ThemeContext), Zustand
- **Routing**: React Router DOM v6
- **UI**: Lucide React icons, Framer Motion

### Backend
- **Runtime**: Node.js + TypeScript
- **Server**: Express with CORS, Helmet
- **APIs**: Google Calendar API, Gmail API
- **Auth**: Google OAuth 2.0
- **AI**: OpenAI, LangChain

## Quick Start

### Prerequisites
- Node.js 18+
- Google Cloud Console project with OAuth credentials
- OpenAI API key

### Backend Setup
```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials:
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
# - OPENAI_API_KEY

npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install

# Configure environment
cp .env.example .env
# Edit .env with:
# - VITE_API_URL=http://localhost:3001

npm run dev
```

Visit `http://localhost:5173` to see the app.

## Deployment

### Frontend (Vercel)
```bash
cd frontend
npx vercel --prod
```

**Production URL**: https://frontend-xi-ashen.vercel.app/

### Backend (Docker)
```bash
docker-compose -f docker-compose.production.yml up -d
```

## Project Structure

```
exec-assistant/
├── frontend/
│   ├── src/
│   │   ├── pages/          # Dashboard, Chat, Calendar, Email, Tasks, Settings
│   │   ├── components/     # Layout, Sidebar, shared components
│   │   ├── contexts/       # ThemeContext
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service functions
│   │   └── index.css       # Swiss design system + CSS variables
│   └── vercel.json         # Vercel SPA config
├── backend/
│   ├── src/
│   │   ├── routes/         # auth, calendar, gmail endpoints
│   │   ├── services/       # TokenStore, GoogleAuthService, CalendarService, GmailService
│   │   └── agents/         # AI agent implementations
│   └── package.json
└── CLAUDE.md               # Development guidance
```

## Design System

The app uses a Swiss design aesthetic with CSS custom properties for theming:

```css
:root {
  --bg: #ffffff;
  --fg: #000000;
  --muted: #666666;
  --border: #000000;
  --surface: #f2f2f2;
  --accent: #ff0000;
}

[data-theme="dark"] {
  --bg: #0a0a0a;
  --fg: #ffffff;
  --muted: #a0a0a0;
  --border: #333333;
  --surface: #1a1a1a;
  --accent: #ff3333;
}
```

### Responsive Breakpoints
- **1024px**: Tablet - sidebar hidden, mobile header shown
- **640px**: Mobile - single column layouts
- **380px**: Small mobile - reduced padding

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate OAuth flow
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/status` - Check authentication status
- `POST /auth/logout` - Clear tokens

### Calendar
- `GET /api/calendar/events` - List upcoming events
- `GET /api/calendar/events/:id` - Get single event
- `POST /api/calendar/events` - Create event
- `GET /api/calendar/today` - Today's agenda

### Gmail
- `GET /api/gmail/inbox` - List inbox messages
- `GET /api/gmail/messages/:id` - Get message details
- `GET /api/gmail/unread` - Unread count
- `GET /api/gmail/search` - Search messages

## Current Status

- [x] Google OAuth integration
- [x] Calendar API integration
- [x] Gmail API integration
- [x] Dark mode support
- [x] Mobile responsiveness
- [ ] Multi-email account support (planned)
- [ ] Email compose/send
- [ ] Calendar event creation UI
- [ ] Task persistence

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built with Swiss precision**
