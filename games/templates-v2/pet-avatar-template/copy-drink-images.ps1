# PowerShell script to copy drink animation images
$sourceDir = "C:\Users\Admin\Downloads\asap uống bia"
$destDir = ".\assets\avatar\drink"

# Create destination directory if it doesn't exist
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force
}

# Copy each file
for ($i = 1; $i -le 10; $i++) {
    $sourceFile = Join-Path $sourceDir "drunk$i.png"
    $destFile = Join-Path $destDir "drunk$i.png"
    
    if (Test-Path $sourceFile) {
        Copy-Item -Path $sourceFile -Destination $destFile -Force
        Write-Host "Copied drunk$i.png" -ForegroundColor Green
    } else {
        Write-Host "File not found: drunk$i.png" -ForegroundColor Yellow
    }
}

Write-Host "`nDone! Copied files to: $destDir" -ForegroundColor Cyan

