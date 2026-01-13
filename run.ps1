# Phone SMS Viewer - Windows PowerShell Launch Script
# This script builds and runs the application

Write-Host "Phone SMS Viewer - Starting..." -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host ""
}

# Check if dist folder exists or is outdated
if (-not (Test-Path "dist\main.js")) {
    Write-Host "Building application..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Build failed" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host ""
}

Write-Host "Launching application..." -ForegroundColor Green
npm start
