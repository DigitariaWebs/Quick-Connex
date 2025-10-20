#!/bin/bash

# Script to kill Next.js servers running on ports 3000-3006
# Usage: ./kill-nextjs-servers.sh

echo "🔍 Scanning for Next.js servers on ports 3000-3006..."

# Get all processes using ports 3000-3006
PROCESSES=$(lsof -i :3000-3006 2>/dev/null)

if [ -z "$PROCESSES" ]; then
    echo "✅ No processes found on ports 3000-3006"
    exit 0
fi

echo "📋 Found processes:"
echo "$PROCESSES"
echo ""

# Extract PIDs and kill them
PIDS=$(echo "$PROCESSES" | awk 'NR>1 {print $2}' | sort -u)

if [ -z "$PIDS" ]; then
    echo "✅ No PIDs found to kill"
    exit 0
fi

echo "🔪 Killing processes: $PIDS"

for PID in $PIDS; do
    # Get process details before killing
    PROCESS_INFO=$(ps -p $PID -o pid,ppid,command 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "   Killing PID $PID:"
        echo "   $PROCESS_INFO"
        kill -9 $PID 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "   ✅ Successfully killed PID $PID"
        else
            echo "   ❌ Failed to kill PID $PID"
        fi
    else
        echo "   ⚠️  PID $PID no longer exists"
    fi
done

echo ""
echo "🔍 Verifying no processes remain on ports 3000-3006..."

# Check if any processes are still running
REMAINING=$(lsof -i :3000-3006 2>/dev/null)

if [ -z "$REMAINING" ]; then
    echo "✅ All processes successfully killed!"
else
    echo "⚠️  Some processes may still be running:"
    echo "$REMAINING"
fi
