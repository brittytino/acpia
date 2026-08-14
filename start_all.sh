#!/usr/bin/env bash
# ==============================================================================
# VERITAS / ACPIA v3 — Cloud Server Automated Provisioner & Launcher
# Complete zero-touch setup: installs Docker, Python3, Node.js, dependencies,
# seeds database, composes containers, and launches all 3 application tiers.
# Compatible with Ubuntu, Debian, CentOS, RHEL, Fedora, Alpine, Amazon Linux.
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
echo "  VERITAS v6 CLOUD SERVER AUTOMATED PROVISIONER & LAUNCHER          "
echo "  Evidence you can trust. Investigation you can defend.               "
echo "======================================================================"
echo -e "${RESET}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Privilege check helper
SUDO=""
if [ "$EUID" -ne 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
    fi
fi

# Detect Server Public / LAN IP
SERVER_IP=$(curl -s --connect-timeout 2 https://ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo -e "${CYAN}Detected Host Server IP: ${BOLD}${SERVER_IP}${RESET}"
echo ""

# ------------------------------------------------------------------------------
# STEP 1: Install System Prerequisites (Docker, Python3, Node.js)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[1/5] Checking and Installing Cloud System Tech Stack...${RESET}"

# Function to install system packages on Linux distros
install_system_deps() {
    if command -v apt-get >/dev/null 2>&1; then
        echo -e "${YELLOW}Updating apt packages...${RESET}"
        $SUDO apt-get update -qq -y
        $SUDO apt-get install -y -qq curl git python3 python3-venv python3-pip nodejs npm gcc libpq-dev netcat-openbsd >/dev/null 2>&1 || $SUDO apt-get install -y curl git python3 python3-venv python3-pip nodejs npm gcc netcat-traditional
    elif command -v yum >/dev/null 2>&1; then
        $SUDO yum install -y curl git python3 python3-pip nodejs npm gcc >/dev/null 2>&1 || true
    elif command -v dnf >/dev/null 2>&1; then
        $SUDO dnf install -y curl git python3 python3-pip nodejs npm gcc >/dev/null 2>&1 || true
    fi
}

install_system_deps

# Check/Install Docker
if ! command -v docker >/dev/null 2>&1; then
    echo -e "${YELLOW}Docker not found. Installing Docker engine automatically...${RESET}"
    curl -fsSL https://get.docker.com | $SUDO sh
    if command -v systemctl >/dev/null 2>&1; then
        $SUDO systemctl enable --now docker || true
        $SUDO systemctl start docker || true
    fi
fi

# Ensure Docker Compose plugin / binary exists
if ! docker compose version >/dev/null 2>&1; then
    if ! command -v docker-compose >/dev/null 2>&1; then
        echo -e "${YELLOW}Installing Docker Compose plugin...${RESET}"
        if command -v apt-get >/dev/null 2>&1; then
            $SUDO apt-get install -y docker-compose-plugin || $SUDO apt-get install -y docker-compose || true
        fi
    fi
fi

# Ensure Docker service is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${YELLOW}Starting Docker service...${RESET}"
    $SUDO systemctl start docker 2>/dev/null || $SUDO service docker start 2>/dev/null || true
fi

echo -e "${GREEN}✔ System Tech Stack Ready: Docker, Python3, Node.js.${RESET}"

# ------------------------------------------------------------------------------
# STEP 2: Compose Database & AI Infrastructure
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[2/5] Composing Infrastructure (Postgres + pgvector)...${RESET}"
$SUDO docker compose up -d postgres || docker compose up -d postgres

echo -e "${YELLOW}Waiting for Postgres database on 127.0.0.1:47800...${RESET}"
for i in {1..30}; do
    if nc -z 127.0.0.1 47800 >/dev/null 2>&1 || (exec 3<>/dev/tcp/127.0.0.1/47800) 2>/dev/null; then
        echo -e "${GREEN}✔ Postgres database ready on 127.0.0.1:47800.${RESET}"
        break
    fi
    sleep 1
done

# ------------------------------------------------------------------------------
# STEP 3: Setup Backend Environment, Python Venv, and Seed DB
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[3/5] Provisioning Backend & Seeding Database...${RESET}"
cd "$SCRIPT_DIR/backend"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        cat <<EOF > .env
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=supersecretjwtkeythatshouldbemuchlonger
BACKEND_PORT=47802
MAX_UPLOAD_SIZE_MB=500
STORAGE_PATH=./storage
DATABASE_URL=postgresql+asyncpg://acpia:password@localhost:47800/acpia
DATABASE_URL_SYNC=postgresql://acpia:password@localhost:47800/acpia
DATABASE_URL_APP=postgresql+asyncpg://veritas_app:veritas_app_dev_pw@localhost:47800/acpia
OLLAMA_BASE_URL=http://localhost:47801
VISION_MODEL=moondream
LLM_MODEL=qwen2.5:3b
EMBED_MODEL=nomic-embed-text
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480
CORS_ORIGINS=["*"]
SEAL_URL=http://localhost:47803
CONSOLE_URL=http://localhost:47804
EOF
    fi
    echo -e "${GREEN}✔ Configured backend/.env${RESET}"
fi

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo -e "${GREEN}✔ Created Python virtual environment at backend/.venv${RESET}"
fi

source .venv/bin/activate

echo -e "${YELLOW}Installing Python libraries...${RESET}"
pip install --upgrade pip --quiet 2>/dev/null || true
pip install \
  "fastapi>=0.109.0" \
  "uvicorn[standard]>=0.27.0" \
  "python-multipart>=0.0.7" \
  "httpx>=0.26.0" \
  "websockets>=12.0" \
  "sqlalchemy>=2.0.36" \
  "asyncpg>=0.29.0" \
  "alembic>=1.13.1" \
  "psycopg2-binary>=2.9.9" \
  "pgvector>=0.2.5" \
  "python-jose[cryptography]>=3.3.0" \
  "passlib[bcrypt]>=1.7.4" \
  "anyio>=4.2.0" \
  "aiofiles>=23.2.1" \
  "Pillow>=10.3.0" \
  "pytesseract>=0.3.10" \
  "piexif>=1.1.3" \
  "fpdf2>=2.7.9" \
  "pydantic>=2.5.3" \
  "pydantic-settings>=2.1.0" \
  "numpy>=1.26.3" \
  "python-dotenv>=1.0.0" \
  "python-dateutil>=2.8.2" \
  --only-binary=:all: --quiet 2>/dev/null || pip install fastapi uvicorn[standard] python-multipart httpx websockets sqlalchemy asyncpg alembic psycopg2-binary pgvector python-jose[cryptography] passlib[bcrypt] anyio aiofiles Pillow pytesseract piexif fpdf2 pydantic pydantic-settings numpy python-dotenv python-dateutil --quiet

echo -e "${YELLOW}Seeding database schema & demo users...${RESET}"
python scripts/seed.py

# ------------------------------------------------------------------------------
# STEP 4: Install Frontend Node Dependencies
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[4/5] Provisioning Frontends (Seal & Police Console)...${RESET}"
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

# ------------------------------------------------------------------------------
# STEP 5: Launch All Tier Services
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[5/5] Launching All Tier Services...${RESET}"

# Stop any old processes on ports
fuser -k 47802/tcp >/dev/null 2>&1 || true
fuser -k 47803/tcp >/dev/null 2>&1 || true
fuser -k 47804/tcp >/dev/null 2>&1 || true

# Launch Backend
cd "$SCRIPT_DIR/backend"
nohup .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 47802 > "$SCRIPT_DIR/backend.log" 2>&1 &
echo -e "${GREEN}✔ Backend API launched on port 47802.${RESET}"

# Launch Seal Frontend
cd "$SCRIPT_DIR/seal"
nohup npm run dev -- -p 47803 > "$SCRIPT_DIR/seal.log" 2>&1 &
echo -e "${GREEN}✔ Seal Frontend launched on port 47803.${RESET}"

# Launch Police Console Frontend
cd "$SCRIPT_DIR/police-console"
nohup npm run dev -- -p 47804 > "$SCRIPT_DIR/console.log" 2>&1 &
echo -e "${GREEN}✔ Police Console Frontend launched on port 47804.${RESET}"

sleep 3

# Final Summary Dashboard
echo -e "${GREEN}${BOLD}"
echo "======================================================================"
echo "  ✔ VERITAS CLOUD SETUP & LAUNCH COMPLETE!                            "
echo "======================================================================"
echo -e "${RESET}"
echo -e "${CYAN}${BOLD}Cloud Server Endpoints:${RESET}"
echo -e "  • Police Console UI : ${GREEN}http://${SERVER_IP}:47804${RESET}  (Local: http://localhost:47804)"
echo -e "  • Seal Citizen App  : ${GREEN}http://${SERVER_IP}:47803${RESET}  (Local: http://localhost:47803)"
echo -e "  • Backend REST API  : ${GREEN}http://${SERVER_IP}:47802${RESET}  (Local: http://localhost:47802)"
echo -e "  • OpenAPI Docs      : ${GREEN}http://${SERVER_IP}:47802/docs${RESET}"
echo -e "  • Postgres Database : ${GREEN}127.0.0.1:47800${RESET} (DB: acpia, User: acpia)"
echo ""
echo -e "${CYAN}${BOLD}Demo Credentials (Password: password123):${RESET}"
echo -e "  • Investigator : ${YELLOW}investigator1${RESET}"
echo -e "  • Supervisor   : ${YELLOW}supervisor1${RESET}"
echo -e "  • Auditor      : ${YELLOW}auditor1${RESET}"
echo -e "  • Admin        : ${YELLOW}admin${RESET}"
echo ""
echo -e "${CYAN}Logs captured at:${RESET}"
echo "  - $SCRIPT_DIR/backend.log"
echo "  - $SCRIPT_DIR/seal.log"
echo "  - $SCRIPT_DIR/console.log"
echo ""
