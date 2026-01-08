@echo off
echo ============================================
echo   Idle Animation Test - Local Server
echo ============================================
echo.
echo Starting server on port 5500...
echo.
echo Open in browser:
echo   http://localhost:5500/idle-animation-test.html
echo.
echo Press Ctrl+C to stop server
echo ============================================
echo.

cd /d "%~dp0.."

REM Check if serve is installed
where serve >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing serve package...
    call npm install
    echo.
)

REM Start server
npx serve . -l tcp://0.0.0.0:5500 -C --no-clipboard
