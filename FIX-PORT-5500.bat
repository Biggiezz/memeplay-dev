@echo off
echo ========================================
echo Fix Port 5500 - Kill Conflicting Processes
echo ========================================
echo.

REM Find all processes using port 5500
echo Checking port 5500...
netstat -ano | findstr :5500 | findstr LISTENING

echo.
echo Killing processes on port 5500...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5500 ^| findstr LISTENING') do (
    echo Killing PID %%a...
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo Waiting 2 seconds for port to be released...
timeout /t 2 /nobreak >nul

echo.
echo Checking port 5500 again...
netstat -ano | findstr :5500 | findstr LISTENING
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 5500 is still in use!
) else (
    echo [SUCCESS] Port 5500 is now free!
)

echo.
echo ========================================
echo Done! You can now start the server.
echo ========================================
pause




