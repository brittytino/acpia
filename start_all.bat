@echo off
REM ==============================================================================
REM VERITAS / ACPIA v3 — Complete System Setup & Startup Script for Windows
REM ==============================================================================

title VERITAS System Launcher

echo ======================================================================
echo   VERITAS v6 — Evidence you can trust. Investigation you can defend.  
echo ======================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

REM 1. Start Docker containers
echo [1/5] Starting Docker containers (Postgres + Ollama)...
docker compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Docker compose failed. Make sure Docker Desktop is running.
    pause
    exit /b 1
)
echo [OK] Docker containers started (Postgres :47800, Ollama :47801).
echo.

REM 2. Setup Backend
echo [2/5] Setting up FastAPI Backend...
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

echo Installing/checking backend dependencies...
pip install fastapi uvicorn[standard] python-multipart httpx websockets sqlalchemy asyncpg alembic psycopg2-binary pgvector python-jose[cryptography] passlib[bcrypt] anyio aiofiles Pillow pytesseract piexif fpdf2 pydantic pydantic-settings numpy python-dotenv python-dateutil --quiet

echo Seeding database tables and demo users...
python scripts\seed.py
echo.

REM 3. Setup Frontends
echo [3/5] Setting up Frontends...
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

REM 4. Launch Services in background windows
echo [4/5] Launching All Services...

cd /d "%ROOT_DIR%backend"
start "VERITAS Backend API (Port 47802)" cmd /k ".venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 47802 --reload"

cd /d "%ROOT_DIR%seal"
start "VERITAS Seal App (Port 47803)" cmd /k "npm run dev -- -p 47803"

cd /d "%ROOT_DIR%police-console"
start "VERITAS Police Console (Port 47804)" cmd /k "npm run dev -- -p 47804"

echo.
echo ======================================================================
echo   ALL VERITAS COMPONENTS ARE LAUNCHED & READY!
echo ======================================================================
echo.
echo Service Endpoints:
echo   - Police Console UI : http://localhost:47804
echo   - Seal Citizen App  : http://localhost:47803
echo   - Backend REST API  : http://localhost:47802
echo   - OpenAPI Docs      : http://localhost:47802/docs
echo   - Postgres DB       : 127.0.0.1:47800 (db: acpia, user: acpia)
echo   - Ollama AI         : 127.0.0.1:47801
echo.
echo Demo Credentials (Password: password123):
echo   - Investigator : investigator1
echo   - Supervisor   : supervisor1
echo   - Auditor      : auditor1
echo   - Admin        : admin
echo.
pause
