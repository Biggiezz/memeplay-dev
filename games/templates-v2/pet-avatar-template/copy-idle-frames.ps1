# Script to copy and rename idle frames
$sourceFolder = "C:\Users\Admin\Downloads\asap móc túi rỗng"
$destFolder = "games\templates-v2\pet-avatar-template\assets\avatar\idle"

# Create destination folder if not exists
if (-not (Test-Path $destFolder)) {
    New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
}

# Get all PNG files and sort by number in filename
$files = Get-ChildItem $sourceFolder -Filter "*.png" | 
    Where-Object { $_.BaseName -match '\d+' } |
    Sort-Object { [int]($_.BaseName -replace '\D+', '') } |
    Select-Object -First 11

Write-Host "Found $($files.Count) files to copy"

# Copy and rename files
for ($i = 0; $i -lt $files.Count; $i++) {
    $frameNum = ($i + 1).ToString('00')
    $destFile = Join-Path $destFolder "idle_$frameNum.png"
    Copy-Item $files[$i].FullName -Destination $destFile -Force
    Write-Host "Copied: $($files[$i].Name) -> idle_$frameNum.png"
}

Write-Host "Done! Copied $($files.Count) files to $destFolder"


