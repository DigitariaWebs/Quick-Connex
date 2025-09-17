# Gmail Email Setup Guide

This guide covers two methods for sending emails directly through Gmail: Gmail API and Gmail SMTP.

## 🔍 **Method Comparison**

| Feature | Gmail API | Gmail SMTP |
|---------|-----------|------------|
| **Authentication** | OAuth 2.0 | App Passwords |
| **Security** | ✅ High | ⚠️ Medium |
| **Setup Complexity** | 🔴 Complex | 🟢 Simple |
| **Quotas** | ✅ High (1B units/day) | ⚠️ Lower (500/day) |
| **Features** | ✅ Full Gmail features | 🟡 Basic sending only |
| **Cost** | ✅ Free | ✅ Free |
| **Recommended For** | Production apps | Quick testing |

## 🚀 **Method 1: Gmail API (Recommended for Production)**

### **Step 1: Set Up Google Cloud Project**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select existing one
3. **Enable Gmail API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"

### **Step 2: Create OAuth 2.0 Credentials**

1. **Go to "APIs & Services" → "Credentials"**
2. **Click "Create Credentials" → "OAuth 2.0 Client IDs"**
3. **Configure OAuth consent screen** (if not done):
   - Choose "External" user type
   - Fill in app information
   - Add your email to test users
4. **Create OAuth 2.0 Client ID**:
   - Application type: "Web application"
   - Name: "Patient Management Email"
   - Authorized redirect URIs: `http://localhost:3000/auth/gmail/callback`
5. **Download credentials** (JSON file)

### **Step 3: Get Access Token**

You'll need to implement OAuth 2.0 flow to get access tokens. Here's a simplified approach:

```javascript
// OAuth 2.0 flow (simplified)
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:3000/auth/gmail/callback'
);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.send'],
});

// After user authorizes, exchange code for tokens
const { tokens } = await oauth2Client.getToken(code);
oauth2Client.setCredentials(tokens);
```

### **Step 4: Environment Configuration**

Add to your `.env.local`:

```bash
# Gmail API Configuration
EMAIL_PROVIDER=gmail-api
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_ACCESS_TOKEN=your-access-token
GMAIL_REFRESH_TOKEN=your-refresh-token
EMAIL_FROM=your-gmail@gmail.com
EMAIL_FROM_NAME=Patient Management System
```

## 📧 **Method 2: Gmail SMTP (Quick Setup)**

### **Step 1: Enable 2-Factor Authentication**

1. **Go to Google Account Settings**: https://myaccount.google.com/
2. **Security** → **2-Step Verification**
3. **Turn on 2-Step Verification**

### **Step 2: Generate App Password**

1. **Go to Google Account Settings** → **Security**
2. **2-Step Verification** → **App passwords**
3. **Select app**: "Mail"
4. **Select device**: "Other (custom name)"
5. **Enter name**: "Patient Management App"
6. **Copy the 16-character password**

### **Step 3: Environment Configuration**

Add to your `.env.local`:

```bash
# Gmail SMTP Configuration
EMAIL_PROVIDER=gmail-smtp
GMAIL_EMAIL=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
EMAIL_FROM=your-gmail@gmail.com
EMAIL_FROM_NAME=Patient Management System
```

## 🔧 **Testing Gmail Integration**

### **Test Gmail API**

```bash
# Update your .env.local with Gmail API credentials
EMAIL_PROVIDER=gmail-api
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_ACCESS_TOKEN=your-access-token

# Run test
node scripts/test-email-simple.js your-email@gmail.com
```

### **Test Gmail SMTP**

```bash
# Update your .env.local with Gmail SMTP credentials
EMAIL_PROVIDER=gmail-smtp
GMAIL_EMAIL=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password

# Run test
node scripts/test-email-simple.js your-email@gmail.com
```

## 📊 **Quotas and Limits**

### **Gmail API Limits**
- **Daily quota**: 1 billion quota units
- **messages.send**: 100 units per call
- **Effective limit**: ~10 million emails/day
- **Rate limit**: 250 quota units per user per second

### **Gmail SMTP Limits**
- **Daily limit**: 500 emails/day (free accounts)
- **Rate limit**: ~100 emails/hour
- **Message size**: 25MB max

## 🔒 **Security Considerations**

### **Gmail API Security**
- ✅ OAuth 2.0 authentication
- ✅ No password storage
- ✅ Token expiration and refresh
- ✅ Granular permissions
- ✅ Audit logging

### **Gmail SMTP Security**
- ⚠️ App passwords (less secure)
- ⚠️ Password storage required
- ⚠️ No token expiration
- ⚠️ All-or-nothing permissions

## 🚨 **Common Issues and Solutions**

### **Gmail API Issues**

#### **"Access blocked: This app's request is invalid"**
- **Solution**: Check OAuth consent screen configuration
- **Fix**: Add your email to test users

#### **"Invalid credentials"**
- **Solution**: Verify client ID and secret
- **Fix**: Re-download credentials from Google Cloud Console

#### **"Token expired"**
- **Solution**: Implement token refresh logic
- **Fix**: Use refresh token to get new access token

### **Gmail SMTP Issues**

#### **"Authentication failed"**
- **Solution**: Check app password
- **Fix**: Generate new app password

#### **"Less secure app access"**
- **Solution**: Enable 2-factor authentication
- **Fix**: Use app passwords instead of regular password

#### **"Daily limit exceeded"**
- **Solution**: Wait 24 hours or upgrade to Google Workspace
- **Fix**: Implement rate limiting

## 🎯 **Recommendations**

### **For Development/Testing**
- Use **Gmail SMTP** for quick setup
- App passwords are sufficient for testing
- Easy to configure and test

### **For Production**
- Use **Gmail API** for better security
- OAuth 2.0 provides better user experience
- Higher quotas and better reliability

### **For High Volume**
- Consider **Google Workspace** for higher limits
- Gmail API provides better scalability
- Professional email addresses

## 📋 **Implementation Checklist**

### **Gmail API Setup**
- [ ] Create Google Cloud project
- [ ] Enable Gmail API
- [ ] Configure OAuth consent screen
- [ ] Create OAuth 2.0 credentials
- [ ] Implement OAuth flow
- [ ] Get access and refresh tokens
- [ ] Configure environment variables
- [ ] Test email sending

### **Gmail SMTP Setup**
- [ ] Enable 2-factor authentication
- [ ] Generate app password
- [ ] Configure environment variables
- [ ] Test email sending

## 🔄 **Migration from SendGrid**

If you want to switch from SendGrid to Gmail:

1. **Set up Gmail provider** (API or SMTP)
2. **Update environment variables**
3. **Test email sending**
4. **Update provider in configuration**
5. **Monitor delivery rates**

## 📞 **Support Resources**

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)

Your Gmail email system is now ready for testing and production use!
