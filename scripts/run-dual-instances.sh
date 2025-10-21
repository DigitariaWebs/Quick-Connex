#!/bin/bash

# Script to run two instances of the app for testing
# Admin on port 3000, Manager on port 3001

echo "🚀 Starting dual instances for testing..."
echo "📋 Admin will be on: http://localhost:3000"
echo "📋 Manager will be on: http://localhost:3001"
echo ""

# Kill any existing servers first
echo "🧹 Cleaning up existing servers..."
npm run kill-servers

# Start admin instance (port 3000)
echo "👑 Starting Admin instance on port 3000..."
PORT=3000 npm run dev:server &
ADMIN_PID=$!

# Wait a moment for the first server to start
sleep 3

# Start manager instance (port 3001)
echo "👨‍💼 Starting Manager instance on port 3001..."
PORT=3001 npm run dev:server &
MANAGER_PID=$!

echo ""
echo "✅ Both instances started!"
echo "👑 Admin: http://localhost:3000"
echo "👨‍💼 Manager: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both instances"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping both instances..."
    kill $ADMIN_PID 2>/dev/null
    kill $MANAGER_PID 2>/dev/null
    npm run kill-servers
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
