@echo off
REM Phone SMS Viewer - Windows Launch Script
REM This script builds and runs the application

echo Phone SMS Viewer - Starting...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

REM Check if dist folder exists or is outdated
if not exist "dist\main.js" (
    echo Building application...
    call npm run build
    if errorlevel 1 (
        echo ERROR: Build failed
        pause
        exit /b 1
    )
    echo.
)

echo Launching application...
call npm start

pause
