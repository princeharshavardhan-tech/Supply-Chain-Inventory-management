@echo off
echo ====================================================
echo  Starting Supply Chain Management System
echo ====================================================
echo.
echo Starting Backend API on http://localhost:5000...
start "Supply Chain Backend API (Port 5000)" cmd /k "cd /d %~dp0backend && npm run dev"

echo Waiting 2 seconds for backend to initialize...
timeout /t 2 /nobreak >nul

echo Starting Frontend Next.js Dashboard on http://localhost:3000...
start "Supply Chain Frontend Dashboard (Port 3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are starting up in separate terminal windows.
echo Opening http://localhost:3000 in your browser...
timeout /t 4 /nobreak >nul
start http://localhost:3000
echo.
echo Done! Keep the backend and frontend terminal windows open.
echo ====================================================
pause

