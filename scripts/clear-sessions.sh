#!/bin/bash

# Clear All Active Sessions Script
# This script clears all active sessions from the database

echo "🔄 Clearing all active sessions..."

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if MongoDB URI is set
if [ -z "$MONGODB_URI" ]; then
    echo "⚠️  MONGODB_URI not set, using default localhost connection"
fi

# Run the JavaScript version (simpler, no TypeScript compilation needed)
echo "🚀 Running session cleanup..."
node scripts/clear-all-sessions.js

echo "✅ Session cleanup complete!"
