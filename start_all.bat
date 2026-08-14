@echo off
:: ==============================================================================
:: VERITAS / ACPIA v3 — Windows Cloud Server & Local Automated Setup Launcher
:: Auto-checks Python, Node.js, Docker, seeds database, and starts all 3 tiers.
:: ==============================================================================

title VERITAS System Launcher

echo ======================================================================
echo   VERITAS v6 CLOUD & SERVER AUTOMATED PROVISIONER & LAUNCHER          
echo   Evidence you can trust. Investigation you can defend.               
echo ======================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: ------------------------------------------------------------------------------
:: STEP 1: Check System Tech Stack Prerequisites (Python, Node.js, Docker)
:: ------------------------------------------------------------------------------
echo [1/5] Checking System Prerequisites...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Python 3 not found in PATH!
    echo Attempting to install Python via winget...
    winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements >nul 2>&1
)

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Node.js not found in PATH!
    echo Attempting to install Node.js via winget...
    winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements >nul 2>&1
)

docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Docker not found in PATH!
    echo Attempting to install Docker Desktop via winget...
    winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements >nul 2>&1
)

:: ------------------------------------------------------------------------------
:: STEP 2: Compose Database Infrastructure (Postgres + pgvector)
:: ------------------------------------------------------------------------------
echo [2/5] Starting Docker containers (Postgres + pgvector)...
docker compose up -d postgres
if %errorlevel% neq 0 (
    echo [WARNING] Docker compose failed. Make sure Docker Desktop is running.
) else (
    echo [OK] Postgres database container up on port 47800.
)
echo.

:: ------------------------------------------------------------------------------
:: STEP 3: Provision Backend Environment & Seed Database
:: ------------------------------------------------------------------------------
echo [3/5] Setting up FastAPI Backend & Seeding Database...
cd /d "%ROOT_DIR%backend"

if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [OK] Created backend\.env
    )
)

if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

echo Installing/checking backend Python libraries...
pip install --upgrade pip --quiet >nul 2>&1
pip install fastapi uvicorn[standard] python-multipart httpx websockets sqlalchemy asyncpg alembic psycopg2-binary pgvector python-jose[cryptography] passlib[bcrypt] anyio aiofiles Pillow pytesseract piexif fpdf2 pydantic pydantic-settings numpy python-dotenv python-dateutil --quiet

echo Seeding database schema & demo users...
python scripts\seed.py
echo.

:: ------------------------------------------------------------------------------
:: STEP 4: Install Frontend Node Dependencies
:: ------------------------------------------------------------------------------
echo [4/5] Provisioning Frontends (Seal & Police Console)...
cd /d "%ROOT_DIR%seal"
if not exist "node_modules" (
    echo Installing Seal frontend dependencies...
    call npm install --quiet
)

cd /d "%ROOT_DIR%police-console"
if not exist "node_modules" (
    echo Installing Police Console frontend dependencies...
    call npm install --quiet
)
echo.

:: ------------------------------------------------------------------------------
:: STEP 5: Launch All Tier Services
:: ------------------------------------------------------------------------------
echo [5/5] Launching All Tier Services...

cd /d "%ROOT_DIR%backend"
start "VERITAS Backend API (Port 47802)" cmd /k ".venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 47802 --reload"

cd /d "%ROOT_DIR%seal"
start "VERITAS Seal App (Port 47803)" cmd /k "npm run dev -- -p 47803"

cd /d "%ROOT_DIR%police-console"
start "VERITAS Police Console (Port 47804)" cmd /k "npm run dev -- -p 47804"

echo.
echo ======================================================================
echo   ✔ ALL VERITAS COMPONENTS ARE LAUNCHED & READY!
echo ======================================================================
echo.
echo Service Endpoints:
echo   - Police Console UI : http://localhost:47804
echo   - Seal Citizen App  : http://localhost:47803
echo   - Backend REST API  : http://localhost:47802
echo   - OpenAPI Docs      : http://localhost:47802/docs
echo   - Postgres DB       : 127.0.0.1:47800 (db: acpia, user: acpia)
echo.
echo Demo Credentials (Password: password123):
echo   - Investigator : investigator1
echo   - Supervisor   : supervisor1
echo   - Auditor      : auditor1
echo   - Admin        : admin
echo.
pause
