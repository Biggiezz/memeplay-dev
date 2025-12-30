Write-Host "Starting Homepage V2 Server..." -ForegroundColor Green
Write-Host ""
Write-Host "Server will run on: http://localhost:8000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

Set-Location $PSScriptRoot

# Try Python first, then Node.js serve
if (Get-Command python -ErrorAction SilentlyContinue) {
    python -m http.server 8000
} elseif (Get-Command node -ErrorAction SilentlyContinue) {
    npx --yes serve -p 8000
} else {
    Write-Host "Error: Python or Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Python or Node.js to run the server." -ForegroundColor Red
    pause
}










