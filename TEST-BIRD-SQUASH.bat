@echo off
echo ============================================
echo   TESTING BIRD SQUASH CLONE (NO-IFRAME)
echo ============================================
echo.
echo Starting local server on port 8000...
echo Browser will open automatically in 3 seconds...
echo.
echo Press Ctrl+C to stop server
echo ============================================
echo.

cd /d "%~dp0"
timeout /t 3 /nobreak >nul
start http://localhost:8000/#bird-squash-clone
python -m http.server 8000

