@echo off
echo ============================================
echo   MemePlay Local Development Server
echo ============================================
echo.
echo Starting server with rewrite support on port 5500...
echo.
echo Short URLs will work:
echo   http://localhost:5500/pacman-game-8041
echo.
echo Press Ctrl+C to stop server
echo ============================================
echo.

cd /d "%~dp0"

REM Check if serve is installed
where serve >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing serve package...
    call npm install
    echo.
)

REM Start server with serve.json config
npx serve -s . -l 5500

