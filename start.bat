@echo off

start "Website" cmd /k "cd /d "%~dp0website" && npm run dev"
start "Server" cmd /k "cd /d "%~dp0server" && npm run dev"

exit