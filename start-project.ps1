Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Starting Supply Chain Management System" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`nStarting Backend API on http://localhost:5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptRoot\backend'; Write-Host '--- Supply Chain API (Port 5000) ---' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 2

Write-Host "Starting Frontend Dashboard on http://localhost:3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptRoot\frontend'; Write-Host '--- Supply Chain Frontend (Port 3000) ---' -ForegroundColor Green; npm run dev"

Start-Sleep -Seconds 3
Write-Host "`nOpening http://localhost:3000 in your browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host "`nBoth servers have been launched in separate terminal windows." -ForegroundColor Cyan
Write-Host "Keep both terminal windows running while using the app." -ForegroundColor White

