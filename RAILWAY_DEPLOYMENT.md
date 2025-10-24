# Railway Deployment Guide

## 🚀 **Why Railway is Perfect for Your App**

### **✅ Advantages:**
- **Custom Server Support** - Your TypeScript server works perfectly
- **Persistent Database Connections** - No cold starts
- **ServerLock Works** - Port management functions properly
- **Full Node.js Environment** - All features available
- **Easy MongoDB Integration** - Built-in database support
- **Environment Variables** - Simple configuration
- **Automatic Deployments** - Git-based deployments

### **🔧 Railway vs Vercel Comparison:**

| Feature | Railway | Vercel |
|---------|---------|--------|
| **Custom Server** | ✅ Full Support | ❌ Not Supported |
| **Database Connections** | ✅ Persistent | ❌ Cold Starts |
| **ServerLock** | ✅ Works | ❌ Not Applicable |
| **File System** | ✅ Full Access | ❌ Read-only |
| **Process Management** | ✅ Full Control | ❌ Serverless Only |
| **Deployment** | ✅ Git-based | ✅ Git-based |
| **Pricing** | ✅ Pay-per-use | ✅ Free Tier Available |

## 🛠️ **Railway Deployment Steps**

### **Step 1: Prepare Your App**

Your app is already configured for Railway! The key files are:

```bash
# Package.json scripts
"start:railway": "NODE_ENV=production npx tsx server.ts"

# Railway configuration
railway.toml
Dockerfile
```

### **Step 2: Deploy to Railway**

#### **Option A: Railway CLI (Recommended)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

#### **Option B: Railway Dashboard**
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Connect your GitHub repository
4. Railway will auto-detect your setup

### **Step 3: Configure Environment Variables**

In Railway dashboard, set these environment variables:

```bash
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/patients-management
JWT_SECRET_KEY=your-super-secret-jwt-key-here
NODE_ENV=production

# Optional
PORT=3000
DATABASE_POOL_SIZE=10
DATABASE_MONITORING=true
```

### **Step 4: Database Setup**

#### **Option A: Railway MongoDB (Recommended)**
1. In Railway dashboard, click "New Service"
2. Select "MongoDB"
3. Railway will provide the connection string
4. Copy the `MONGODB_URI` to your environment variables

#### **Option B: External MongoDB**
- Use MongoDB Atlas (free tier available)
- Use any MongoDB provider
- Set the connection string in environment variables

## 🔧 **Railway Configuration Files**

### **railway.toml**
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run start:railway"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[environments.production]
variables = { NODE_ENV = "production" }
```

### **Dockerfile (Optional)**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:railway"]
```

## 📊 **Railway-Specific Features You'll Get**

### **1. Custom Server with Database Init**
```typescript
// server.ts runs on Railway
await DatabaseService.connect(); // ✅ Works perfectly
```

### **2. ServerLock Functionality**
```typescript
// ServerLock works on Railway
const serverLock = new ServerLock(config.port);
await serverLock.acquireLock(); // ✅ Port management works
```

### **3. Persistent Database Connections**
```typescript
// Database connection stays alive
await DatabaseService.connect(); // ✅ No cold starts
```

### **4. Full File System Access**
```typescript
// Lock files work on Railway
this.lockFile = path.join(os.tmpdir(), `patients-management-server-${port}.lock`);
```

## 🧪 **Testing Railway Deployment**

### **Local Testing:**
```bash
# Test production build locally
NODE_ENV=production npm run start:railway
```

### **Railway Testing:**
```bash
# Check deployment logs
railway logs

# Check service status
railway status

# Open deployed app
railway open
```

## 🔍 **Railway Deployment Verification**

### **Expected Railway Output:**
```
🚀 CUSTOM SERVER STARTING
==================================================
📅 Started at: 2024-01-01T12:00:00.000Z
🌍 Environment: production
⚡ Bundler: Turbopack
🌐 Host: 0.0.0.0:3000
==================================================

🔄 Database: Initializing connection...
✅ Database: Connected successfully
📊 Database: Health status - healthy
🔒 Server lock acquired for port 3000
🎉 Server ready on http://0.0.0.0:3000
```

### **Health Check Endpoint:**
```bash
# Railway will automatically check this endpoint
curl https://your-app.railway.app/api/health
```

## 🚨 **Troubleshooting Railway Deployment**

### **Common Issues:**

#### **Issue: "Database operation failed"**
**Solution**: Check `MONGODB_URI` environment variable

#### **Issue: "Port already in use"**
**Solution**: Railway handles this automatically, but ServerLock provides extra safety

#### **Issue: "Module not found"**
**Solution**: Ensure all dependencies are in `package.json`

#### **Issue: "Build failed"**
**Solution**: Check Railway logs for specific error messages

### **Debugging Commands:**
```bash
# View logs
railway logs --follow

# Check environment variables
railway variables

# Restart service
railway restart

# Check service status
railway status
```

## 💰 **Railway Pricing**

### **Free Tier:**
- ✅ $5 credit monthly
- ✅ 500 hours of usage
- ✅ Perfect for development/testing

### **Pro Plan:**
- ✅ $5/month per service
- ✅ Unlimited usage
- ✅ Production-ready

## 🔧 **Railway vs Other Platforms**

| Platform | Custom Server | Database | Pricing | Ease of Use |
|----------|---------------|----------|---------|-------------|
| **Railway** | ✅ Full Support | ✅ Built-in | ✅ $5/month | ✅ Very Easy |
| **DigitalOcean** | ✅ Full Support | ❌ Separate | ✅ $5/month | ⚠️ Moderate |
| **Heroku** | ✅ Full Support | ❌ Separate | ❌ $7/month | ⚠️ Moderate |
| **Vercel** | ❌ Not Supported | ❌ Cold Starts | ✅ Free Tier | ✅ Easy |

## 🎯 **Railway Deployment Checklist**

### **Before Deployment:**
- [ ] Set `MONGODB_URI` in Railway dashboard
- [ ] Set `JWT_SECRET_KEY` in Railway dashboard
- [ ] Test locally with `NODE_ENV=production`
- [ ] Verify all environment variables

### **After Deployment:**
- [ ] Check Railway logs for database connection
- [ ] Test login functionality
- [ ] Verify session management
- [ ] Check audit logging
- [ ] Test error handling

## 🚀 **Quick Start Commands**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables
railway variables set MONGODB_URI="your-connection-string"
railway variables set JWT_SECRET_KEY="your-secret-key"

# Deploy and open
railway up
railway open
```

Railway is the **perfect platform** for your custom TypeScript server with database initialization!
