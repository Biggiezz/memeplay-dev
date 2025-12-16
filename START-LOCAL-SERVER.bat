@echo off
echo ============================================
echo   MemePlay Local Development Server
echo ============================================
echo.
echo Starting server with rewrite support on port 5500...
echo.
echo Server will be accessible from:
echo   - Local: http://localhost:5500
echo   - Mobile: http://192.168.1.4:5500 (same WiFi)
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
REM Bind to 0.0.0.0 to allow access from mobile devices on same network
REM -C flag enables CORS for cross-origin requests
REM NOTE: Do NOT use -s flag (SPA mode) as it breaks rewrite rules
npx serve . -l tcp://0.0.0.0:5500 -C --config serve.json --no-clipboard

