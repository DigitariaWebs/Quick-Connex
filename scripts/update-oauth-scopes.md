# Update OAuth Consent Screen Scopes

## 🔧 **Required Action: Update Google Cloud Console**

You need to add additional scopes to your OAuth consent screen in Google Cloud Console.

### **Step 1: Go to Google Cloud Console**
1. Visit: https://console.cloud.google.com/
2. Select your project: "Patient Management System"
3. Go to "APIs & Services" → "OAuth consent screen"

### **Step 2: Add Required Scopes**
1. Click "Edit App"
2. Go to "Scopes" section
3. Click "Add or Remove Scopes"
4. Add these scopes:
   - `https://www.googleapis.com/auth/gmail.send` (already added)
   - `https://www.googleapis.com/auth/userinfo.email` (NEW)
   - `https://www.googleapis.com/auth/userinfo.profile` (NEW)

### **Step 3: Save Changes**
1. Click "Save and Continue"
2. Go through the remaining steps
3. Click "Save"

### **Step 4: Test Again**
After updating the scopes, try the OAuth flow again:

```bash
node scripts/complete-gmail-oauth.js
```

## 🚨 **Important Notes**

- The OAuth consent screen changes may take a few minutes to propagate
- You might need to wait 5-10 minutes before testing again
- If you're still getting errors, try clearing your browser cache

## 🔍 **Alternative: Use Only Gmail Send Scope**

If you continue having issues, we can modify the code to work with only the Gmail send scope and skip the profile access. Let me know if you'd prefer this approach.
