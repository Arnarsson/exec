#!/bin/bash
# Deployment script for Executive Assistant to Hetzner VPS

set -e

VPS_IP="37.27.220.214"
VPS_USER="root"
REMOTE_DIR="/opt/exec-assistant"
MEMORY_DIR="/opt/Memory-rag"

echo "🚀 Executive Assistant Deployment Script"
echo "========================================="
echo "Target: $VPS_USER@$VPS_IP"
echo ""

# Check for SSH key
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 $VPS_USER@$VPS_IP "echo connected" 2>/dev/null; then
    echo "❌ Cannot connect to VPS. Please ensure SSH key is configured."
    exit 1
fi

echo "✅ SSH connection verified"

# Step 1: Create directories on VPS
echo ""
echo "📁 Creating directories on VPS..."
ssh $VPS_USER@$VPS_IP "mkdir -p $REMOTE_DIR $MEMORY_DIR"

# Step 2: Sync exec-assistant files
echo ""
echo "📤 Syncing exec-assistant to VPS..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
    --exclude 'frontend/node_modules' --exclude 'frontend/dist' \
    ./ $VPS_USER@$VPS_IP:$REMOTE_DIR/

# Step 3: Sync Memory-rag files
echo ""
echo "📤 Syncing Memory-rag to VPS..."
rsync -avz --exclude '__pycache__' --exclude '.venv' --exclude '.git' \
    --exclude '*.sqlite' --exclude '*.sqlite-*' \
    ../Memory-rag/ $VPS_USER@$VPS_IP:$MEMORY_DIR/

# Step 4: Set up environment files (reminder)
echo ""
echo "⚠️  IMPORTANT: After first deployment, update the .env.production files:"
echo "   - $REMOTE_DIR/backend/.env.production"
echo "     → Set OPENAI_API_KEY"
echo "     → Update CORS_ORIGINS and FRONTEND_URL with actual Vercel URL"
echo "   - $MEMORY_DIR/.env.production"
echo "     → Set OPENAI_API_KEY"
echo ""

# Step 5: Start services
echo "🐳 Starting Docker Compose services..."
ssh $VPS_USER@$VPS_IP "cd $REMOTE_DIR && docker compose -f docker-compose.production.yml up -d --build"

# Step 6: Check status
echo ""
echo "📊 Checking service status..."
sleep 10
ssh $VPS_USER@$VPS_IP "cd $REMOTE_DIR && docker compose -f docker-compose.production.yml ps"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📌 Next Steps:"
echo "   1. Update .env.production files with real OPENAI_API_KEY"
echo "   2. Deploy frontend to Vercel"
echo "   3. Update CORS_ORIGINS in backend .env with actual Vercel URL"
echo "   4. Add Google OAuth redirect URI in GCP Console:"
echo "      http://37.27.220.214/auth/google/callback"
echo ""
echo "🔗 Backend Health Check: http://$VPS_IP/health"
echo "🔗 Memory Health Check:  http://$VPS_IP/memory/health"
