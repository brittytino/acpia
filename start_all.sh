#!/usr/bin/env bash
# ==============================================================================
# VERITAS / ACPIA v3 — Cloud Server Automated Provisioner & Launcher
# Complete zero-touch setup: installs Docker and runs the full multi-tier
# containerized environment.
# Compatible with Ubuntu, Debian, CentOS, RHEL, Fedora, Alpine, Amazon Linux.
# ==============================================================================

set -e

GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
RESET="\033[0m"
BOLD="\033[1m"

echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "  VERITAS v6 CLOUD SERVER AUTOMATED PROVISIONER & LAUNCHER          "
echo "  Evidence you can trust. Investigation you can defend.               "
echo "======================================================================"
echo -e "${RESET}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

SUDO=""
if [ "$EUID" -ne 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
    fi
fi

SERVER_IP=$(curl -s --connect-timeout 2 https://ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
echo -e "${CYAN}Detected Host Server IP: ${BOLD}${SERVER_IP}${RESET}\n"

# ------------------------------------------------------------------------------
# STEP 1: Ensure Docker & Docker Compose are Installed
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[1/3] Checking Docker installation...${RESET}"

if ! command -v docker >/dev/null 2>&1; then
    echo -e "${YELLOW}Docker not found. Installing Docker engine automatically...${RESET}"
    curl -fsSL https://get.docker.com | $SUDO sh
    if command -v systemctl >/dev/null 2>&1; then
        $SUDO systemctl enable --now docker || true
        $SUDO systemctl start docker || true
    fi
fi

if ! docker compose version >/dev/null 2>&1; then
    if ! command -v docker-compose >/dev/null 2>&1; then
        echo -e "${YELLOW}Installing Docker Compose plugin...${RESET}"
        if command -v apt-get >/dev/null 2>&1; then
            $SUDO apt-get update -qq
            $SUDO apt-get install -y docker-compose-plugin || $SUDO apt-get install -y docker-compose || true
        elif command -v yum >/dev/null 2>&1; then
            $SUDO yum install -y docker-compose-plugin || true
        fi
    fi
fi

if ! docker info >/dev/null 2>&1; then
    echo -e "${YELLOW}Starting Docker service...${RESET}"
    $SUDO systemctl start docker 2>/dev/null || $SUDO service docker start 2>/dev/null || true
fi

echo -e "${GREEN}✔ System Tech Stack Ready: Docker.${RESET}"

# ------------------------------------------------------------------------------
# STEP 2: Configure Environment Variables
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[2/3] Configuring Environment...${RESET}"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✔ Created .env from template.${RESET}"
    fi
fi

# ------------------------------------------------------------------------------
# STEP 3: Compose the Entire Project
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[3/3] Building and Launching Multi-Tier Containers...${RESET}"
echo -e "${CYAN}This will compile the backend, Node.js frontends, and initialize the database.${RESET}"

# Use docker compose plugin if available, fallback to docker-compose
COMPOSE_CMD="docker compose"
if ! docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
fi

$SUDO $COMPOSE_CMD up -d --build

echo -e "${YELLOW}Pulling required AI models into Ollama (this might take a few minutes)...${RESET}"
$SUDO docker exec acpia-ollama ollama pull qwen2.5:3b || true
$SUDO docker exec acpia-ollama ollama pull nomic-embed-text || true
$SUDO docker exec acpia-ollama ollama pull moondream || true

echo -e "\n${GREEN}${BOLD}"
echo "======================================================================"
echo "  ✔ VERITAS CLOUD DOCKER SETUP & LAUNCH COMPLETE!                     "
echo "======================================================================"
echo -e "${RESET}"
echo -e "${CYAN}${BOLD}Cloud Server Endpoints:${RESET}"
echo -e "  • Police Console UI : ${GREEN}http://${SERVER_IP}:48804${RESET}  (Local: http://localhost:48804)"
echo -e "  • Seal Citizen App  : ${GREEN}http://${SERVER_IP}:48803${RESET}  (Local: http://localhost:48803)"
echo -e "  • Backend REST API  : ${GREEN}http://${SERVER_IP}:48802${RESET}  (Local: http://localhost:48802)"
echo ""
echo -e "${CYAN}${BOLD}Demo Credentials (Password: password123):${RESET}"
echo -e "  • Investigator : ${YELLOW}investigator1${RESET}"
echo -e "  • Supervisor   : ${YELLOW}supervisor1${RESET}"
echo -e "  • Auditor      : ${YELLOW}auditor1${RESET}"
echo -e "  • Admin        : ${YELLOW}admin${RESET}"
echo ""
echo -e "${CYAN}To view logs, run:${RESET} $SUDO $COMPOSE_CMD logs -f"
echo ""
