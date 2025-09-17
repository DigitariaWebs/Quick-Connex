# Email System Setup Guide (SendGrid Only)

This guide will help you set up and test the SendGrid email system for your patient management application.

## Quick Setup

### 1. Create SendGrid Account
1. Go to [SendGrid.com](https://sendgrid.com)
2. Sign up for a free account (100 emails/day free)
3. Verify your email address

### 2. Get API Key
1. Go to Settings → API Keys
2. Click "Create API Key"
3. Choose "Restricted Access"
4. Give it a name like "Patient Management App"
5. Set permissions:
   - **Mail Send**: Full Access
   - **Mail Settings**: Read Access
   - **Suppressions**: Read Access
6. Copy the API key (starts with `SG.`)

### 3. Environment Configuration
Create or update your `.env` file:

```bash
# Email Configuration - SendGrid Only
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Patient Management System
EMAIL_REPLY_TO=noreply@yourdomain.com

# Communication System
COMMUNICATION_ENABLED=true
EMAIL_ENABLED=true
SMS_ENABLED=false

# Test Configuration
TEST_EMAIL=your-email@example.com
TEST_JWT_TOKEN=your-jwt-token-here
```

### 4. Verify Sender Identity
1. Go to Settings → Sender Authentication
2. Choose "Single Sender Verification" for testing
3. Add your email address and verify it
4. For production, set up Domain Authentication

## Testing the Email System

### Run the Email Test Script
```bash
node scripts/test-email-only.js
```

### Manual Testing via API
```bash
curl -X POST http://localhost:3000/api/communication/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "channel": "email",
    "recipient": {
      "email": "test@example.com",
      "name": "Test User"
    },
    "content": {
      "subject": "Test Email",
      "text": "This is a test email from your patient management system.",
      "html": "<p>This is a test email from your patient management system.</p>"
    },
    "metadata": {
      "category": "test"
    }
  }'
```

## Available Email Templates

The system includes these built-in email templates:

### 1. Transfer Notification
- **Template ID**: `transfer_notification`
- **Variables**: `patientName`, `fromHospital`, `toHospital`, `status`, `priority`, `scheduledDate`
- **Use Case**: Transfer status updates

### 2. Urgent Alert
- **Template ID**: `urgent_alert`
- **Variables**: `patientName`, `fromHospital`, `toHospital`, `priority`, `reason`
- **Use Case**: Urgent transfer alerts

### 3. System Notification
- **Template ID**: `system_notification`
- **Variables**: `title`, `message`, `actionUrl`
- **Use Case**: System messages

## Testing Different Email Types

### 1. Basic Email
```javascript
{
  "channel": "email",
  "recipient": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  "content": {
    "subject": "Test Email",
    "text": "This is a test email.",
    "html": "<p>This is a test email.</p>"
  }
}
```

### 2. Email with Template
```javascript
{
  "channel": "email",
  "recipient": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  "content": {
    "template": "transfer_notification",
    "templateData": {
      "patientName": "John Smith",
      "fromHospital": "City Hospital",
      "toHospital": "Regional Medical Center",
      "status": "In Progress",
      "priority": "High"
    }
  }
}
```

### 3. Urgent Email
```javascript
{
  "channel": "email",
  "recipient": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  "content": {
    "subject": "🚨 URGENT: Transfer Alert",
    "text": "Urgent transfer requires immediate attention.",
    "html": "<h2 style='color: red;'>🚨 URGENT TRANSFER ALERT</h2><p>Urgent transfer requires immediate attention.</p>"
  },
  "priority": "urgent"
}
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failed
- **Error**: "SendGrid API key is required"
- **Solution**: Check your `SENDGRID_API_KEY` in `.env` file
- **Verify**: API key starts with `SG.`

#### 2. Sender Not Verified
- **Error**: "The from address does not match a verified Sender Identity"
- **Solution**: Verify your sender email in SendGrid dashboard
- **Steps**: Settings → Sender Authentication → Single Sender Verification

#### 3. Emails Going to Spam
- **Cause**: Unverified sender domain
- **Solution**: Set up Domain Authentication in SendGrid
- **Steps**: Settings → Sender Authentication → Domain Authentication

#### 4. API Rate Limits
- **Error**: "Rate limit exceeded"
- **Solution**: Wait or upgrade SendGrid plan
- **Free Tier**: 100 emails/day

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=communication:*
```

## Production Setup

### 1. Domain Authentication
1. Go to Settings → Sender Authentication → Domain Authentication
2. Add your domain (e.g., `yourdomain.com`)
3. Add DNS records (SPF, DKIM, DMARC)
4. Verify domain

### 2. IP Warmup
1. Go to Settings → IP Management
2. Set up dedicated IP
3. Follow IP warmup schedule
4. Gradually increase sending volume

### 3. Webhook Configuration
1. Go to Settings → Mail Settings → Event Webhook
2. Set HTTP Post URL: `https://yourdomain.com/api/webhooks/sendgrid`
3. Select events to track:
   - Delivered
   - Bounced
   - Dropped
   - Spam Report
   - Unsubscribe

### 4. Monitoring
- Set up alerts for bounce rates
- Monitor delivery rates
- Track spam reports
- Review suppression lists

## Cost Information

### SendGrid Pricing
- **Free Tier**: 100 emails/day
- **Essentials**: $19.95/month for 50K emails
- **Pro**: $89.95/month for 100K emails
- **Overages**: $0.00075 per email

### Cost Optimization
- Use templates to reduce API calls
- Batch sending for multiple recipients
- Monitor usage to avoid overages
- Set up rate limiting

## Next Steps

1. ✅ Set up SendGrid account and get API key
2. ✅ Configure environment variables
3. ✅ Test basic email sending
4. ✅ Test template rendering
5. ✅ Verify sender authentication
6. 🔄 Set up webhooks for delivery tracking
7. 🔄 Configure production settings
8. 🔄 Set up monitoring and alerts

## Support Resources

- [SendGrid Documentation](https://docs.sendgrid.com)
- [SendGrid Status Page](https://status.sendgrid.com)
- [SendGrid Support](https://support.sendgrid.com)
- [API Reference](https://docs.sendgrid.com/api-reference)

Your email system is now ready for testing! Run the test script to verify everything is working correctly.
