@echo off
echo ========================================
echo   Crypto Blocks 8x8 - Mobile Server
echo ========================================
echo.

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP:~1%

echo Local IP Address: %IP%
echo.
echo Mobile URL:
echo http://%IP%:5500/games/crypto-blocks/index.html
echo.
echo Press Ctrl+C to stop server
echo ========================================
echo.

REM Start Python HTTP server with IP binding
python -m http.server 5500 --bind 0.0.0.0

