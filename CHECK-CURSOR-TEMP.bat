@echo off
echo ========================================
echo CHECK CURSOR TEMP FILES SIZE
echo ========================================
echo.

powershell -Command "$cursorDirs = Get-ChildItem -Path $env:LOCALAPPDATA\Temp -Filter 'cursor*' -Directory -ErrorAction SilentlyContinue; $totalSize = 0; Write-Host \"Found $($cursorDirs.Count) cursor folders:`n\"; foreach ($dir in $cursorDirs | Sort-Object LastWriteTime -Descending) { $size = (Get-ChildItem $dir.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; $totalSize += $size; Write-Host \"$($dir.Name)\"; Write-Host \"  Size: $([math]::Round($size / 1MB, 2)) MB\"; Write-Host \"  Last Modified: $($dir.LastWriteTime)\"; Write-Host \"\" }; Write-Host \"========================================\"; Write-Host \"TOTAL SIZE: $([math]::Round($totalSize / 1GB, 2)) GB\"; Write-Host \"========================================\""

echo.
echo Press any key to exit...
pause >nul

