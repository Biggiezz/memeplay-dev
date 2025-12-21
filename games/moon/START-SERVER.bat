@echo off
echo ============================================
echo   STARTING SERVER FOR MOON GAME
echo ============================================
echo.
echo Server starting on port 8000...
echo.
echo Game URL: http://localhost:8000/games/moon/index.html
echo.
echo Press Ctrl+C to stop server
echo ============================================
echo.

cd /d "%~dp0\..\.."
npx http-server . -p 8000 -c-1 --cors

