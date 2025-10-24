# Deployment Guide

## 🚀 **Development vs Production Setup**

### **Development (Local)**
```bash
# Uses custom TypeScript server with database initialization
npm run dev
```

### **Production Options**

#### **Option 1: Custom Server (Railway, DigitalOcean, etc.)**
```bash
# Uses custom TypeScript server
npm run start:railway
```

#### **Option 2: Serverless (Vercel, Netlify)**
```bash
# Uses standard Next.js (not recommended for this app)
npm run build
npm run start
```

## 🔧 **Package.json Scripts Explained**

| Script | Command | Use Case | Database Init |
|--------|---------|----------|---------------|
| `dev` | `npx tsx server.ts` | **Development** | ✅ Custom server |
| `dev:standard` | `next dev --turbopack` | **Development (fallback)** | ❌ No |
| `start` | `next start` | **Production (serverless)** | ✅ API routes |
| `start:railway` | `npx tsx server.ts` | **Production (custom server)** | ✅ Custom server |

## 🌐 **Platform-Specific Deployment**

### **Vercel (Serverless)**
- ✅ **Automatic**: Uses `npm run build` + `npm run start`
- ✅ **Database**: Initialized in API routes via `initializeDatabase()`
- ✅ **Environment**: Set `MONGODB_URI` in Vercel dashboard
- ❌ **Custom Server**: Not supported

### **Railway (Custom Server)**
- ✅ **Custom Server**: Uses `npm run start:railway`
- ✅ **Database**: Initialized on server startup
- ✅ **Environment**: Set `MONGODB_URI` in Railway dashboard
- ✅ **Full Control**: Custom server with ServerLock

### **DigitalOcean App Platform**
- ✅ **Custom Server**: Uses `npm run start:railway`
- ✅ **Database**: Initialized on server startup
- ✅ **Environment**: Set `MONGODB_URI` in dashboard
- ✅ **Full Control**: Custom server with ServerLock

### **Netlify (Serverless)**
- ✅ **Automatic**: Uses `npm run build` + `npm run start`
- ✅ **Database**: Initialized in API routes
- ✅ **Environment**: Set `MONGODB_URI` in Netlify dashboard
- ❌ **Custom Server**: Not supported

## 🔍 **How to Verify Which Server is Running**

### **Custom TypeScript Server Output:**
```
🚀 CUSTOM SERVER STARTING
==================================================
📅 Started at: 10/24/2025, 8:03:29 PM
🌍 Environment: development
⚡ Bundler: Turbopack
🌐 Host: localhost:3000
==================================================

🔄 Database: Initializing connection...
✅ Database: Connected successfully
```

### **Standard Next.js Server Output:**
```
▲ Next.js 15.5.3 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://192.168.1.7:3000
- Environments: .env.local
```

## 🛠️ **Environment Variables Required**

### **All Environments:**
```bash
MONGODB_URI=mongodb://localhost:27017/patients-management
JWT_SECRET_KEY=your-secret-key
NODE_ENV=production
```

### **Production Additional:**
```bash
# For custom servers
PORT=3000

# For serverless (optional)
NEXT_PUBLIC_API_URL=https://your-domain.com
```

## 📊 **Database Initialization Strategy**

### **Custom Server (Railway, DigitalOcean)**
```typescript
// server.ts - Database initialized on startup
await initializeDatabase();
```

### **Serverless (Vercel, Netlify)**
```typescript
// API routes - Database initialized on first request
await initializeDatabase();
```

## 🚨 **Common Issues and Solutions**

### **Issue: "Database operation failed"**
**Cause**: Database not initialized
**Solution**: 
- Development: Use `npm run dev` (custom server)
- Production: Ensure `MONGODB_URI` is set

### **Issue: "Port already in use"**
**Cause**: Multiple servers running
**Solution**: 
- Kill existing processes: `npm run kill-servers`
- Use ServerLock: `npm run dev` (handles this automatically)

### **Issue: "Module not found"**
**Cause**: TypeScript compilation issues
**Solution**: 
- Install dependencies: `npm install`
- Use tsx: `npx tsx server.ts`

## 🧪 **Testing Deployment**

### **Local Testing:**
```bash
# Test custom server
npm run dev

# Test standard server
npm run dev:standard
```

### **Production Testing:**
```bash
# Test production build
npm run build
npm run start

# Test custom server
npm run start:railway
```

## 📋 **Deployment Checklist**

### **Before Deployment:**
- [ ] Set `MONGODB_URI` environment variable
- [ ] Set `JWT_SECRET_KEY` environment variable
- [ ] Test database connection locally
- [ ] Verify all environment variables

### **After Deployment:**
- [ ] Check database connection
- [ ] Test login functionality
- [ ] Verify session management
- [ ] Check audit logging
- [ ] Test error handling

## 🔧 **Platform-Specific Configuration**

### **Vercel (vercel.json)**
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NODE_ENV": "production"
  }
}
```

### **Railway (railway.toml)**
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run start:railway"
restartPolicyType = "on_failure"
```

### **DigitalOcean (doctl)**
```yaml
name: patients-management
region: nyc
services:
- name: web
  source_dir: .
  github:
    repo: your-repo
    branch: main
  run_command: npm run start:railway
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
```

## 💡 **Best Practices**

1. **Always use environment variables** for sensitive data
2. **Test locally** before deploying
3. **Monitor database connections** in production
4. **Use proper error handling** for database failures
5. **Implement health checks** for production monitoring
6. **Keep database credentials secure**
7. **Use connection pooling** for production databases
8. **Monitor performance** and optimize queries
