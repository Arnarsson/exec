# CLAUDE.md

This file provides guidance to Claude Code when working with the exec-assistant project.

## Project Overview

**Perfect Executive Assistant** is an AI-powered executive assistant with real-time streaming chat, calendar integration, email management, and task tracking. Built with a Swiss design system aesthetic.

**Architecture**: React frontend (Vite) + Node.js backend (Express) with Google OAuth integration for Calendar & Gmail APIs.

## Tech Stack

### Frontend (`/frontend`)
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Swiss design system (custom CSS variables)
- **State**: React Context (ThemeContext), Zustand
- **UI Libraries**: Lucide React icons, Framer Motion, Recharts
- **Routing**: React Router DOM v6

### Backend (`/backend`)
- **Runtime**: Node.js + TypeScript + tsx
- **Server**: Express with CORS, Helmet
- **APIs**: Google Calendar API, Gmail API (googleapis)
- **Auth**: Google OAuth 2.0 (google-auth-library)
- **AI**: OpenAI, LangChain

## Directory Structure

```
exec-assistant/
├── frontend/
│   ├── src/
│   │   ├── pages/           # Page components (Dashboard, Chat, Calendar, Email, Tasks, Settings)
│   │   ├── components/      # Shared components (Layout, Sidebar, etc.)
│   │   ├── contexts/        # React contexts (ThemeContext)
│   │   ├── services/        # API service functions
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript types
│   │   ├── index.css        # Global styles + CSS variables
│   │   └── main.tsx         # App entry point
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/          # API route handlers (auth, calendar, gmail)
│   │   ├── services/        # Business logic (TokenStore, GoogleAuthService, CalendarService, GmailService)
│   │   ├── agents/          # AI agent implementations
│   │   ├── events/          # Event handling
│   │   └── index.ts         # Server entry point
│   └── package.json
└── docker-compose.production.yml
```

## Design System

### CSS Variables (defined in `index.css`)

The app uses CSS custom properties for theming. All colors should reference these variables:

```css
:root {
  --bg: #ffffff;          /* Background */
  --fg: #000000;          /* Foreground/text */
  --muted: #666666;       /* Secondary text */
  --border: #000000;      /* Borders */
  --surface: #f2f2f2;     /* Card/surface backgrounds */
  --surface-hover: #e5e5e5;
  --accent: #ff0000;      /* Red accent (errors, urgent) */
  --success: #16a34a;     /* Green (completed, success) */
  --success-bg: #dcfce7;  /* Light green background */
  --warning: #f59e0b;
  --info: #3b82f6;
}

[data-theme="dark"] {
  --bg: #0a0a0a;
  --fg: #ffffff;
  --muted: #a0a0a0;
  --border: #333333;
  --surface: #1a1a1a;
  --surface-hover: #252525;
  --accent: #ff3333;
  --success: #22c55e;
  --success-bg: #14532d;
}
```

### Swiss Design Classes

- `.swiss-sidebar` - Sidebar with border
- `.swiss-hero` - Page header with title
- `.swiss-metric-grid` - 4-column metric display
- `.swiss-section-title` - Uppercase section headers
- `.swiss-item` - List item styling
- `.swiss-badge` - Status badges
- `.swiss-btn` - Button base styles
- `.swiss-input` - Input field styling

### Styling Rules

1. **Never use hardcoded hex colors** - Always use `var(--variable-name)`
2. **Dark mode support** - All inline styles must use CSS variables
3. **Swiss aesthetic** - Uppercase labels, thin borders, minimal decoration
4. **Font**: Inter family (`var(--font-main)`)

## Development Commands

### Frontend
```bash
cd frontend
npm install
npm run dev          # Start dev server (Vite)
npm run build        # Production build
npm run lint         # ESLint check
npm run type-check   # TypeScript check
```

### Backend
```bash
cd backend
npm install
npm run dev          # Start dev server (tsx watch)
npm run build        # TypeScript compile
npm start            # Run production build
```

## API Endpoints

### Auth Routes (`/auth/*`)
- `GET /auth/google` - Initiate OAuth flow
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/status` - Check auth status
- `POST /auth/logout` - Clear tokens

### Calendar Routes (`/api/calendar/*`)
- `GET /api/calendar/events` - List upcoming events
- `GET /api/calendar/events/:id` - Get single event
- `POST /api/calendar/events` - Create event
- `GET /api/calendar/today` - Today's agenda

### Gmail Routes (`/api/gmail/*`)
- `GET /api/gmail/inbox` - List inbox messages
- `GET /api/gmail/messages/:id` - Get single message
- `GET /api/gmail/unread` - Unread count
- `GET /api/gmail/search` - Search messages

## Key Files

### Theme System
- `frontend/src/contexts/ThemeContext.tsx` - Theme provider with localStorage persistence
- `frontend/src/index.css` - CSS variable definitions
- `frontend/src/main.tsx` - ThemeProvider wrapper

### API Integration
- `backend/src/services/TokenStore.ts` - OAuth token persistence
- `backend/src/services/GoogleAuthService.ts` - OAuth client management
- `backend/src/services/CalendarService.ts` - Google Calendar API wrapper
- `backend/src/services/GmailService.ts` - Gmail API wrapper

### Pages
- `Dashboard.tsx` - Main dashboard with metrics
- `Chat.tsx` - AI chat interface with memory integration
- `Calendar.tsx` - Calendar view with events
- `Email.tsx` - Email inbox and detail view
- `Tasks.tsx` - Task management
- `Settings.tsx` - App settings and Google account connection

## Deployment

Production deployment uses Docker:
```bash
docker-compose -f docker-compose.production.yml up -d
```

Backend runs on port 3001, frontend served via Caddy/nginx.

## Common Tasks

### Adding a New Page
1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add nav link in `frontend/src/components/Layout.tsx`
4. Use CSS variables for all colors

### Adding an API Endpoint
1. Create route file in `backend/src/routes/`
2. Create service in `backend/src/services/`
3. Register route in `backend/src/index.ts`

### Fixing Dark Mode Issues
1. Find hardcoded hex colors (e.g., `#000`, `#fff`, `#f2f2f2`)
2. Replace with appropriate CSS variable (e.g., `var(--fg)`, `var(--bg)`, `var(--surface)`)
3. Test in both light and dark modes

## Environment Variables

### Backend (`.env`)
```
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
OPENAI_API_KEY=xxx
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:3001
```

## Testing

```bash
# Frontend
cd frontend && npm run test

# Backend
cd backend && npm test
```

## Current Status

- Google OAuth integration: Complete
- Calendar API integration: Complete
- Gmail API integration: Complete
- Dark mode support: Complete
- Mobile responsiveness: In progress
- Multi-email account support: Planned
