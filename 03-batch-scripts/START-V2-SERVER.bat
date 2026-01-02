@echo off
echo Starting Homepage V2 Server...
echo.
echo Server will run on: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0"
python -m http.server 8000
