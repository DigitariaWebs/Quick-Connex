# Gmail SMTP Setup Guide

This guide shows you how to set up Gmail SMTP with Nodemailer as an alternative to Gmail API.

## 🔍 **Gmail API vs Gmail SMTP**

| Feature | Gmail API | Gmail SMTP |
|---------|-----------|------------|
| **Authentication** | OAuth 2.0 | App Password |
| **Setup Complexity** | Complex | Simple |
| **Rate Limits** | 1 billion/day | 500/day per user |
| **Delivery Tracking** | ✅ Full | ❌ Limited |
| **Security** | ✅ High | ⚠️ Medium |
| **Reliability** | ✅ High | ✅ High |
| **Cost** | Free | Free |

## 🚀 **Quick Setup (Gmail SMTP)**

### **Step 1: Enable 2-Factor Authentication**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled

### **Step 2: Generate App Password**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click **App passwords** (under "Signing in to Google")
3. Select **Mail** and **Other (custom name)**
4. Enter "Patient Management System"
5. Click **Generate**
6. **Copy the 16-character password** (you'll need this)

### **Step 3: Update Environment Variables**
Add these to your `.env.local` file:

```bash
# Gmail SMTP Configuration
EMAIL_PROVIDER=gmail-smtp
GMAIL_EMAIL=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Patient Management System
```

### **Step 4: Test Gmail SMTP**
```bash
# Test Gmail SMTP implementation
node scripts/test-gmail-comparison.js your-email@gmail.com
```

## 🔧 **Detailed Setup**

### **Environment Variables**

```bash
# Email Provider Selection
EMAIL_PROVIDER=gmail-smtp

# Gmail SMTP Configuration
GMAIL_EMAIL=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password

# Email Settings
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Patient Management System
EMAIL_REPLY_TO=your-email@gmail.com
```

### **SMTP Configuration Details**

The Gmail SMTP provider uses these settings:
- **Host**: `smtp.gmail.com`
- **Port**: `587` (TLS)
- **Security**: `STARTTLS`
- **Authentication**: App Password

## 🧪 **Testing**

### **Test Gmail SMTP Only**
```bash
# Set provider to Gmail SMTP
echo "EMAIL_PROVIDER=gmail-smtp" >> .env.local

# Test Gmail SMTP
node scripts/test-gmail-comparison.js your-email@gmail.com
```

### **Compare Both Implementations**
```bash
# Test both Gmail API and Gmail SMTP
node scripts/test-gmail-comparison.js your-email@gmail.com
```

### **Run Integrity Tests**
```bash
# Test the complete system
node scripts/test-gmail-api-integrity.js your-email@gmail.com
```

## 📊 **When to Use Gmail SMTP**

### **✅ Use Gmail SMTP When:**
- You want **simple setup** (just app password)
- You're in **development** or **testing**
- You need **quick implementation**
- You prefer **standard SMTP** protocol
- You want **easy debugging**

### **❌ Don't Use Gmail SMTP When:**
- You need **high volume** (500/day limit)
- You need **delivery tracking**
- You want **maximum security**
- You're building **production system**

## 🔒 **Security Considerations**

### **App Passwords**
- **More secure** than regular passwords
- **Specific to application** (can be revoked)
- **16-character** random string
- **No access to account** (read-only for email)

### **Best Practices**
1. **Use app passwords** instead of regular passwords
2. **Revoke unused** app passwords regularly
3. **Monitor usage** and set up alerts
4. **Use environment variables** (never hardcode)

## 🚨 **Troubleshooting**

### **Common Issues**

#### **"Invalid login" Error**
```bash
# Check your app password
echo $GMAIL_APP_PASSWORD

# Verify 2FA is enabled
# Regenerate app password if needed
```

#### **"Connection timeout" Error**
```bash
# Check network connectivity
ping smtp.gmail.com

# Verify firewall settings
# Check if port 587 is blocked
```

#### **"Authentication failed" Error**
```bash
# Verify app password is correct
# Check if 2FA is enabled
# Ensure app password is for "Mail" service
```

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=nodemailer* node scripts/test-gmail-comparison.js
```

## 📈 **Performance**

### **Rate Limits**
- **Gmail SMTP**: 500 emails per day per user
- **Gmail API**: 1 billion emails per day
- **Burst limits**: 100 emails per hour

### **Monitoring**
```bash
# Check current usage
# Gmail doesn't provide built-in monitoring
# Implement your own usage tracking
```

## 🔄 **Switching Between Providers**

### **Switch to Gmail SMTP**
```bash
# Update .env.local
sed -i 's/EMAIL_PROVIDER=gmail-api/EMAIL_PROVIDER=gmail-smtp/' .env.local

# Test the change
node scripts/test-gmail-comparison.js your-email@gmail.com
```

### **Switch to Gmail API**
```bash
# Update .env.local
sed -i 's/EMAIL_PROVIDER=gmail-smtp/EMAIL_PROVIDER=gmail-api/' .env.local

# Test the change
node scripts/test-gmail-comparison.js your-email@gmail.com
```

## 📚 **Additional Resources**

- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [App Passwords Guide](https://support.google.com/accounts/answer/185833)
- [Nodemailer Documentation](https://nodemailer.com/about/)
- [Gmail API vs SMTP Comparison](https://developers.google.com/gmail/api/guides/sending)

## 🎯 **Next Steps**

1. **Choose your approach** (Gmail API vs Gmail SMTP)
2. **Complete the setup** using this guide
3. **Test both implementations** with comparison script
4. **Run integrity tests** to verify everything works
5. **Deploy to production** with your chosen provider

---

**Need help?** Check the troubleshooting section or run the diagnostic script:
```bash
node scripts/diagnose-gmail-api.js
```


