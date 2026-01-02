@echo off
echo ====================================
echo Starting Avatar Test Server
echo ====================================
echo.

REM Change to project root
cd /d "%~dp0\.."

REM Kill any process using port 8000
echo Checking port 8000...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :8000 ^| findstr LISTENING') do (
    echo Killing process %%a on port 8000...
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

REM Get local IP address
echo Getting local IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set LOCAL_IP=%%b
        goto :ip_found
    )
)
:ip_found

echo.
echo ====================================
echo Server URLs:
echo ====================================
echo.
echo Desktop: http://localhost:8000/avatar-creator.html
echo.
if defined LOCAL_IP (
    echo Mobile (same WiFi): http://%LOCAL_IP%:8000/avatar-creator.html
    echo.
) else (
    echo Mobile: Run 'ipconfig' to find your IP address
    echo.
)
echo ====================================
echo.
echo Press Ctrl+C to stop the server
echo ====================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Start server
echo Starting server...
echo.
npx --yes serve . -l tcp://0.0.0.0:8000 -C --no-clipboard

pause



