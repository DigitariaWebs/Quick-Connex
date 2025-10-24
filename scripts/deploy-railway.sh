#!/bin/bash

# Railway Deployment Script
# Automates the deployment process to Railway

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Railway Deployment Script${NC}"
echo "=================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo "Please install it with: npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️ Not logged in to Railway${NC}"
    echo "Please run: railway login"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI found and logged in${NC}"

# Check environment variables
echo -e "${BLUE}🔍 Checking environment variables...${NC}"

if [ -z "$MONGODB_URI" ]; then
    echo -e "${YELLOW}⚠️ MONGODB_URI not set${NC}"
    echo "Please set it with: railway variables set MONGODB_URI='your-connection-string'"
fi

if [ -z "$JWT_SECRET_KEY" ]; then
    echo -e "${YELLOW}⚠️ JWT_SECRET_KEY not set${NC}"
    echo "Please set it with: railway variables set JWT_SECRET_KEY='your-secret-key'"
fi

# Deploy to Railway
echo -e "${BLUE}🚀 Deploying to Railway...${NC}"
railway up

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Check deployment logs: railway logs"
echo "2. Open your app: railway open"
echo "3. Check service status: railway status"
echo ""
echo -e "${BLUE}🔧 Useful commands:${NC}"
echo "- View logs: railway logs --follow"
echo "- Restart service: railway restart"
echo "- Check variables: railway variables"
echo "- Open app: railway open"
