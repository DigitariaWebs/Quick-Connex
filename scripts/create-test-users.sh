#!/bin/bash

# Script to create test users for approval system testing
# This script creates 3 employees and 3 managers with all necessary fields

echo "🚀 Creating test users for approval system testing..."
echo "📋 This will create:"
echo "   • 3 Employees with documents (using Montreal.docx)"
echo "   • 3 Managers with CIUSSS and Hospital assignments"
echo "   • All users will have status: PENDING"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Montreal.docx exists
if [ ! -f "test/Montréal.docx" ]; then
    echo "⚠️  Warning: Montreal.docx not found in test/ directory"
    echo "   The script will create mock documents instead"
    echo ""
fi

# Run the Node.js script
echo "🔧 Running test user creation script..."
node scripts/essentials/create-test-users.js

echo ""
echo "✅ Test user creation completed!"
echo ""
echo "🎯 Next steps:"
echo "1. Check your email for admin notifications"
echo "2. Go to http://localhost:3000/admin/users"
echo "3. Test the new dashboard approval system!"
