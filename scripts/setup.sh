#!/bin/bash

# 🎯 Executive Assistant MVP - Setup Script
# This script sets up the complete development environment

set -e

echo "🚀 Setting up Executive Assistant MVP..."
echo "======================================"

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📁 Project root: $PROJECT_ROOT"

# Create environment files from templates
echo "📝 Setting up environment configuration..."

# Backend .env file
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << EOF
# Executive Assistant MVP - Backend Configuration

# Server Configuration
NODE_ENV=development
PORT=3001
WS_PORT=8080

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# OpenAI Configuration (Required)
OPENAI_API_KEY=your_openai_api_key_here

# Google Integration (Optional - for Calendar & Gmail)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Google Service Account (Alternative to OAuth)
GOOGLE_CREDENTIALS={}

# Database (Optional - for persistent storage)
DATABASE_URL=postgresql://user:password@localhost:5432/executive_assistant

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined

# Development
DEBUG=true
ENABLE_SWAGGER=true
EOF
    echo "✅ Created backend/.env template"
else
    echo "⚡ backend/.env already exists"
fi

# Frontend .env file  
if [ ! -f "frontend/.env" ]; then
    cat > frontend/.env << EOF
# Executive Assistant MVP - Frontend Configuration

# Development
VITE_NODE_ENV=development

# Backend API
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:8080

# CopilotKit Configuration
VITE_COPILOT_PUBLIC_API_KEY=your_copilot_api_key_here

# Features
VITE_ENABLE_DEBUG=true
VITE_ENABLE_TELEMETRY=false

# Theme
VITE_DEFAULT_THEME=light
VITE_ENABLE_DARK_MODE=true

# Google OAuth (Frontend)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# Application Info
VITE_APP_NAME=Executive Assistant
VITE_APP_VERSION=1.0.0
EOF
    echo "✅ Created frontend/.env template"
else
    echo "⚡ frontend/.env already exists"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd "$PROJECT_ROOT/backend"

if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Backend dependencies installed"
else
    echo "⚡ Backend dependencies already installed"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Frontend dependencies installed"
else
    echo "⚡ Frontend dependencies already installed"
fi

# Build TypeScript backend
echo "🔨 Building backend TypeScript..."
cd "$PROJECT_ROOT/backend"
npm run build

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Create uploads directory (for future file handling)
mkdir -p "$PROJECT_ROOT/uploads"

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📝 Next Steps:"
echo "1. Configure your API keys in backend/.env:"
echo "   - OPENAI_API_KEY (required for AI functionality)"
echo "   - GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET (for calendar/email)"
echo ""
echo "2. Start the development servers:"
echo "   ./scripts/dev.sh"
echo ""
echo "3. Access the application:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:3001"
echo "   - WebSocket: ws://localhost:8080"
echo ""
echo "🔧 For production deployment, see ./scripts/deploy.sh"
echo ""
