@echo off
echo ========================================
echo Starting MemePlay V2 Local Server
echo Port: 5500
echo Config: serve.json
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
npx serve . -l 5500 --config serve.json --no-clipboard

pause




