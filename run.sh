#!/bin/bash
# Phone SMS Viewer - Linux/macOS Launch Script
# This script builds and runs the application

echo "Phone SMS Viewer - Starting..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
    echo ""
fi

# Check if dist folder exists or is outdated
if [ ! -f "dist/main.js" ]; then
    echo "Building application..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "ERROR: Build failed"
        exit 1
    fi
    echo ""
fi

echo "Launching application..."
npm start
