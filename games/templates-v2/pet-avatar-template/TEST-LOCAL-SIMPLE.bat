@echo off
echo ============================================
echo   TESTING PET AVATAR GAME (SIMPLE)
echo ============================================
echo.
echo Starting server from project root...
echo.
echo Game URL: http://localhost:8000/games/templates-v2/pet-avatar-template/test-local.html
echo.
echo Press Ctrl+C to stop server
echo ============================================
echo.

cd /d "%~dp0\..\..\.."
npx --yes http-server . -p 8000 -c-1 --cors



