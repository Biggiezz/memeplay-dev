@echo off
echo ============================================
echo   TESTING MOON ROCKET GAME
echo ============================================
echo.
echo Starting local server on port 8000...
echo Browser will open automatically in 3 seconds...
echo.
echo Game URL: http://localhost:8000/moon/index.html
echo.
echo Press Ctrl+C to stop server
echo ============================================
echo.

cd /d "%~dp0\..\.."
timeout /t 3 /nobreak >nul
start http://localhost:8000/games/moon/index.html
python -m http.server 8000


