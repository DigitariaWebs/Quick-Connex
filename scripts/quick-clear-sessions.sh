#!/bin/bash

# Quick Session Clear Script
# This script provides quick access to session management

echo "🔧 Session Management Tools"
echo "=========================="
echo ""
echo "Available commands:"
echo "1. List all sessions:"
echo "   node scripts/session-manager.js list"
echo ""
echo "2. Show session statistics:"
echo "   node scripts/session-manager.js stats"
echo ""
echo "3. Clear ALL sessions (⚠️  logs out all users):"
echo "   node scripts/session-manager.js clear-all"
echo ""
echo "4. Clear sessions for specific user:"
echo "   node scripts/session-manager.js clear-user <email>"
echo ""
echo "5. Clear only expired sessions:"
echo "   node scripts/session-manager.js clear-expired"
echo ""
echo "6. Quick clear all sessions:"
echo "   node scripts/clear-all-sessions.js"
echo ""

# If arguments provided, run the command
if [ $# -gt 0 ]; then
    echo "🚀 Running: $@"
    echo ""
    node scripts/session-manager.js "$@"
else
    echo "💡 Add arguments to run a command, e.g.:"
    echo "   ./scripts/quick-clear-sessions.sh list"
    echo "   ./scripts/quick-clear-sessions.sh clear-all"
fi
