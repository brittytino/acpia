@echo off
:: ==============================================================================
:: VERITAS / ACPIA v3 — Windows Cloud Server & Local Automated Setup Launcher
:: Auto-checks Docker, builds, and starts all tiers via docker-compose.
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
:: STEP 1: Check System Tech Stack Prerequisites (Docker)
:: ------------------------------------------------------------------------------
echo [1/3] Checking Docker installation...

docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Docker not found in PATH!
    echo Attempting to install Docker Desktop via winget...
    winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements >nul 2>&1
    echo Please restart your terminal after Docker installation completes.
    pause
    exit /b 1
)

:: ------------------------------------------------------------------------------
:: STEP 2: Configure Environment Variables
:: ------------------------------------------------------------------------------
echo [2/3] Configuring Environment...
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [OK] Created .env from template.
    )
)

:: ------------------------------------------------------------------------------
:: STEP 3: Compose the Entire Project
:: ------------------------------------------------------------------------------
echo [3/3] Building and Launching Multi-Tier Containers...
echo This will compile the backend, Node.js frontends, and initialize the database.

docker compose up -d --build
if %errorlevel% neq 0 (
    echo [WARNING] Docker compose failed. Make sure Docker Desktop is running.
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo   ✔ ALL VERITAS COMPONENTS ARE LAUNCHED & READY VIA DOCKER!
echo ======================================================================
echo.
echo Service Endpoints:
echo   - Police Console UI : http://localhost:48804
echo   - Seal Citizen App  : http://localhost:48803
echo   - Backend REST API  : http://localhost:48802
echo   - OpenAPI Docs      : http://localhost:48802/docs
echo   - Postgres DB       : 127.0.0.1:48800 (db: acpia, user: acpia)
echo.
echo Demo Credentials (Password: password123):
echo   - Investigator : investigator1
echo   - Supervisor   : supervisor1
echo   - Auditor      : auditor1
echo   - Admin        : admin
echo.
echo To view logs, run: docker compose logs -f
echo.
pause
