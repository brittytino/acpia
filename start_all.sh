#!/usr/bin/env bash
# ==============================================================================
# VERITAS / ACPIA v3 — Complete System Setup & Startup Script
# Works on Linux, macOS, and WSL.
# ==============================================================================

set -e

GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
RED="\033[31m"
BOLD="\033[1m"
RESET="\033[0m"

echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "  VERITAS v6 — Evidence you can trust. Investigation you can defend.  "
echo "======================================================================"
echo -e "${RESET}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 1. Check Docker & Start Database + AI containers
echo -e "${YELLOW}[1/5] Starting Docker containers (Postgres + Ollama)...${RESET}"
if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
        docker compose up -d
        echo -e "${GREEN}✔ Docker containers up (Postgres :47800, Ollama :47801).${RESET}"
    else
        echo -e "${RED}⚠ Docker daemon is not running. Please start Docker and rerun.${RESET}"
        exit 1
    fi
else
    echo -e "${RED}⚠ Docker command not found. Please install Docker Compose.${RESET}"
    exit 1
fi

# Wait for Postgres port 47800 to be open
echo -e "${YELLOW}Waiting for Postgres on port 47800...${RESET}"
for i in {1..30}; do
    if nc -z 127.0.0.1 47800 >/dev/null 2>&1 || (exec 3<>/dev/tcp/127.0.0.1/47800) 2>/dev/null; then
        echo -e "${GREEN}✔ Postgres database ready on 127.0.0.1:47800.${RESET}"
        break
    fi
    sleep 1
done

# 2. Setup Backend (FastAPI + Python venv)
echo -e "${YELLOW}[2/5] Setting up FastAPI Backend...${RESET}"
cd "$SCRIPT_DIR/backend"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✔ Created backend/.env from .env.example${RESET}"
    fi
fi

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo -e "${GREEN}✔ Created Python virtual environment at backend/.venv${RESET}"
fi

source .venv/bin/activate

echo -e "${YELLOW}Installing/checking backend dependencies...${RESET}"
pip install -r pyproject.toml --only-binary=:all: --quiet 2>/dev/null || pip install fastapi uvicorn[standard] python-multipart httpx websockets sqlalchemy asyncpg alembic psycopg2-binary pgvector python-jose[cryptography] passlib[bcrypt] anyio aiofiles Pillow pytesseract piexif fpdf2 pydantic pydantic-settings numpy python-dotenv python-dateutil --quiet

echo -e "${YELLOW}Seeding database tables and demo users...${RESET}"
python scripts/seed.py

# 3. Setup Frontends (Seal & Police Console)
echo -e "${YELLOW}[3/5] Setting up Frontends...${RESET}"
cd "$SCRIPT_DIR/seal"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing Seal frontend dependencies...${RESET}"
    npm install --quiet
fi

cd "$SCRIPT_DIR/police-console"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing Police Console frontend dependencies...${RESET}"
    npm install --quiet
fi

# 4. Launch Services
echo -e "${YELLOW}[4/5] Launching All Services...${RESET}"

# Stop any running processes on our ports if present
fuser -k 47802/tcp >/dev/null 2>&1 || true
fuser -k 47803/tcp >/dev/null 2>&1 || true
fuser -k 47804/tcp >/dev/null 2>&1 || true

# Launch Backend
cd "$SCRIPT_DIR/backend"
nohup .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 47802 > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

# Launch Seal Frontend
cd "$SCRIPT_DIR/seal"
nohup npm run dev -- -p 47803 > "$SCRIPT_DIR/seal.log" 2>&1 &
SEAL_PID=$!

# Launch Police Console Frontend
cd "$SCRIPT_DIR/police-console"
nohup npm run dev -- -p 47804 > "$SCRIPT_DIR/console.log" 2>&1 &
CONSOLE_PID=$!

sleep 3

# 5. Display Status Dashboard
echo -e "${GREEN}${BOLD}"
echo "======================================================================"
echo "  ✔ ALL VERITAS COMPONENTS ARE RUNNING & READY!                       "
echo "======================================================================"
echo -e "${RESET}"
echo -e "${CYAN}${BOLD}Service Endpoints:${RESET}"
echo -e "  • Police Console UI : ${GREEN}http://localhost:47804${RESET}"
echo -e "  • Seal Citizen App  : ${GREEN}http://localhost:47803${RESET}"
echo -e "  • Backend REST API  : ${GREEN}http://localhost:47802${RESET}"
echo -e "  • OpenAPI Docs      : ${GREEN}http://localhost:47802/docs${RESET}"
echo -e "  • Postgres DB       : ${GREEN}127.0.0.1:47800${RESET} (db: acpia, user: acpia)"
echo -e "  • Ollama AI         : ${GREEN}127.0.0.1:47801${RESET}"
echo ""
echo -e "${CYAN}${BOLD}Demo Credentials (Password: password123):${RESET}"
echo -e "  • Investigator : ${YELLOW}investigator1${RESET}"
echo -e "  • Supervisor   : ${YELLOW}supervisor1${RESET}"
echo -e "  • Auditor      : ${YELLOW}auditor1${RESET}"
echo -e "  • Admin        : ${YELLOW}admin${RESET}"
echo ""
echo -e "${CYAN}Logs generated at:${RESET}"
echo "  - $SCRIPT_DIR/backend.log"
echo "  - $SCRIPT_DIR/seal.log"
echo "  - $SCRIPT_DIR/console.log"
echo ""
