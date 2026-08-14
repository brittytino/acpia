#!/bin/bash
# ACPIA Quick Start Script — Tino's Machine (192.168.11.209)
# Run this after a reboot or fresh start
# Usage: bash start_acpia.sh

set -e
ACPIA_DIR="/mnt/Data/SRCAS HACKATHON/acpia"
echo "🚀 Starting ACPIA Platform..."
echo "   Host IP: 192.168.11.209"
echo ""

# 1. Start infrastructure containers
echo "📦 Starting Docker services (Postgres, Neo4j, Redis, MinIO, Keycloak)..."
cd "$ACPIA_DIR"
docker compose up -d postgres redis minio neo4j keycloak
echo "   Waiting 5s for DBs to be ready..."
sleep 5

# 2. Start Ollama AI server
echo "🤖 Starting Ollama AI server (port 11535)..."
docker start acpia-ollama 2>/dev/null || docker run -d \
  --name acpia-ollama \
  --gpus all \
  -p 11535:11434 \
  -v ollama_models:/root/.ollama \
  --restart unless-stopped \
  ollama/ollama
echo "   Waiting 5s for Ollama to boot..."
sleep 5

# 3. Pull models if not already cached
echo "🧠 Checking AI models (this runs in background)..."
docker exec acpia-ollama ollama pull llama3.1:8b &
docker exec acpia-ollama ollama pull llava:13b &
docker exec acpia-ollama ollama pull nomic-embed-text &

# 4. Start FastAPI backend
echo "⚙️  Starting FastAPI backend (port 8765)..."
cd "$ACPIA_DIR/backend"
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8765 --reload &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 5

# 5. Start Celery worker
echo "🔄 Starting Celery worker..."
cd "$ACPIA_DIR/backend"
celery -A app.workers.celery_app worker --loglevel=info --concurrency=2 -Q ingest,analysis,default &
CELERY_PID=$!
echo "   Celery PID: $CELERY_PID"

# 6. Start Frontend
echo "🎨 Starting Next.js frontend (port 3737)..."
cd "$ACPIA_DIR/frontend"
npm run dev -- -p 3737 &
FRONTEND_PID=$!

sleep 8

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ ACPIA is RUNNING!"
echo ""
echo "  📡 Backend API:   http://192.168.11.209:8765"
echo "  📖 API Docs:      http://192.168.11.209:8765/docs"
echo "  🎨 Frontend:      http://192.168.11.209:3737"
echo "  🤖 Ollama AI:     http://192.168.11.209:11535"
echo "  🗝️  Keycloak:     http://192.168.11.209:8180"
echo "  🗄️  MinIO UI:     http://192.168.11.209:9201"
echo "  📊 Neo4j Browser: http://192.168.11.209:7575"
echo ""
echo "  👤 Login: admin / Admin@acpia1"
echo "            investigator1 / Inv@acpia1"
echo ""
echo "  📤 Share this with your team:"
echo "  BARATH & CHINNAYA → Connect to http://192.168.11.209:8765"
echo "═══════════════════════════════════════════════════════"

# Health check
curl -s http://localhost:8765/health && echo " ✅ API healthy"
