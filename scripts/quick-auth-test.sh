#!/bin/bash

# Quick Authentication Test Runner
# Simple script to run authentication tests with minimal setup

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Quick Authentication Test Runner${NC}"
echo "=================================="

# Check if server is running
echo -e "${YELLOW}Checking if server is running...${NC}"
if curl -s -f "http://localhost:3000/api/auth/verify" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${YELLOW}⚠️ Server is not running. Please start it with: npm run dev${NC}"
    echo "Then run this script again."
    exit 1
fi

# Run the simple test
echo -e "${YELLOW}Running authentication tests...${NC}"
node scripts/simple-auth-test.js

echo -e "${GREEN}✅ Test completed!${NC}"
