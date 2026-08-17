@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   Starting StarWaves Services (DB, Server, Worker)
echo ===================================================

cd /d "%~dp0"

echo [1/2] Starting Docker services (Postgres DB, FastAPI Server, WhatsApp Worker, Nginx)...
docker compose up -d

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start Docker services. Make sure Docker Desktop is running.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/2] Launching Frontend Dev Server...
start "StarWaves Frontend" cmd /k "cd /d "%~dp0website" && npm run dev"

echo ===================================================
echo   StarWaves is running!
echo   - Frontend:        http://localhost:5173
echo   - Backend API:     http://localhost:8000 (or http://localhost/api/v1)
echo   - WhatsApp Worker: http://localhost:3001
echo   - PostgreSQL DB:   localhost:5432
echo ===================================================

exit /b 0