@echo off
chcp 65001 >nul
echo ========================================
echo Copy Idle Frames (11 frames)
echo ========================================
echo.

set "source=C:\Users\Admin\Downloads\asap móc túi rỗng"
set "dest=games\templates-v2\pet-avatar-template\assets\avatar\idle"

if not exist "%dest%" mkdir "%dest%"

echo Searching for PNG files in: %source%
echo.

REM Get all PNG files, sort by number in filename, take first 11
powershell -Command "$files = Get-ChildItem '%source%' -Filter '*.png' | Where-Object { $_.BaseName -match '\d+' } | Sort-Object { [int]($_.BaseName -replace '\D+', '') } | Select-Object -First 11; $i = 1; foreach ($f in $files) { $num = $i.ToString('00'); Copy-Item $f.FullName -Destination '%dest%\idle_$num.png' -Force; Write-Host \"Copied: $($f.Name) -^> idle_$num.png\"; $i++ }"

echo.
echo Done! Check: %dest%
pause


