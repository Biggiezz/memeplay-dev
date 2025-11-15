@echo off
echo ========================================
echo CLEAN CURSOR TEMP FILES
echo ========================================
echo.
echo This will delete all cursor-browser-extension session folders in Temp
echo.
pause

powershell -Command "$cursorDirs = Get-ChildItem -Path $env:LOCALAPPDATA\Temp -Filter 'cursor*' -Directory -ErrorAction SilentlyContinue; $totalSize = 0; foreach ($dir in $cursorDirs) { $size = (Get-ChildItem $dir.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; $totalSize += $size; Write-Host \"Deleting: $($dir.Name) ($([math]::Round($size / 1MB, 2)) MB)\"; Remove-Item -Path $dir.FullName -Recurse -Force -ErrorAction SilentlyContinue }; Write-Host \"`nTotal freed: $([math]::Round($totalSize / 1GB, 2)) GB\""

echo.
echo Done! Press any key to exit...
pause >nul

