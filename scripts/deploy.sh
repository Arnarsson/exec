#!/bin/bash

# 🚀 Executive Assistant MVP - Production Deployment Script
# Builds and deploys the application for production

set -e

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Executive Assistant MVP - Production Deployment"
echo "=================================================="

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose detected"

# Build production images
echo "🔨 Building production Docker images..."
docker-compose -f docker-compose.prod.yml build

# Start production deployment
echo "🚀 Starting production deployment..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "💓 Checking service health..."

# Check backend health
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend service is healthy"
else
    echo "❌ Backend service health check failed"
    echo "📋 Showing backend logs:"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

# Check if frontend is serving
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend service is healthy"
else
    echo "❌ Frontend service health check failed"
    echo "📋 Showing frontend logs:"
    docker-compose -f docker-compose.prod.yml logs frontend
    exit 1
fi

echo ""
echo "🎉 Production Deployment Successful!"
echo "===================================="
echo ""
echo "📍 Application URLs:"
echo "   🌐 Frontend: http://localhost:3000"
echo "   📡 Backend API: http://localhost:3001"
echo "   💓 Health Check: http://localhost:3001/health"
echo ""
echo "🔧 Management Commands:"
echo "   📋 View logs: docker-compose -f docker-compose.prod.yml logs"
echo "   🛑 Stop: docker-compose -f docker-compose.prod.yml down"
echo "   🔄 Restart: docker-compose -f docker-compose.prod.yml restart"
echo "   📊 Status: docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "⚠️  Remember to:"
echo "   • Configure environment variables for production"
echo "   • Set up SSL certificates for HTTPS"
echo "   • Configure proper database for persistence"
echo "   • Set up monitoring and logging"
echo ""
