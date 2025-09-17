# Twilio + SendGrid Setup Guide

This guide will help you set up Twilio for SMS and SendGrid for email in your patient management application.

## Environment Configuration

Create a `.env` file with the following configuration:

```bash
# Communication System Configuration
COMMUNICATION_ENABLED=true
EMAIL_ENABLED=true
SMS_ENABLED=true

# Email Configuration - SendGrid
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Patient Management System
EMAIL_REPLY_TO=noreply@yourdomain.com

# SendGrid Configuration
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here

# SMS Configuration - Twilio
SMS_PROVIDER=twilio
SMS_FROM_NUMBER=+1234567890

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token-here
```

## SendGrid Setup

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

### 3. Verify Sender Identity
1. Go to Settings → Sender Authentication
2. Choose "Single Sender Verification" for testing
3. Add your email address and verify it
4. For production, set up Domain Authentication

### 4. Configure Webhooks (Optional)
1. Go to Settings → Mail Settings → Event Webhook
2. Set HTTP Post URL: `https://yourdomain.com/api/webhooks/sendgrid`
3. Select events to track:
   - Delivered
   - Bounced
   - Dropped
   - Spam Report
   - Unsubscribe

## Twilio Setup

### 1. Create Twilio Account
1. Go to [Twilio.com](https://twilio.com)
2. Sign up for a free account ($15 credit)
3. Verify your phone number

### 2. Get Credentials
1. Go to Console Dashboard
2. Copy your Account SID (starts with `AC`)
3. Copy your Auth Token (click to reveal)

### 3. Get Phone Number
1. Go to Phone Numbers → Manage → Buy a number
2. Choose a number with SMS capabilities
3. Note the phone number (format: +1234567890)

### 4. Configure Webhooks (Optional)
1. Go to Phone Numbers → Manage → Active numbers
2. Click on your number
3. Set webhook URL: `https://yourdomain.com/api/webhooks/twilio`
4. Set HTTP method to POST

## Testing Your Setup

### Test Email Sending
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

### Test SMS Sending
```bash
curl -X POST http://localhost:3000/api/communication/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "channel": "sms",
    "recipient": {
      "phone": "+1234567890",
      "name": "Test User"
    },
    "content": {
      "text": "Test SMS from Patient Management System"
    },
    "metadata": {
      "category": "test"
    }
  }'
```

## Production Considerations

### SendGrid Production Setup
1. **Domain Authentication**: Set up SPF, DKIM, and DMARC records
2. **IP Warmup**: Gradually increase sending volume
3. **Reputation Monitoring**: Monitor bounce rates and spam reports
4. **Suppression Lists**: Manage unsubscribes and bounces

### Twilio Production Setup
1. **Phone Number**: Use a dedicated business number
2. **Messaging Service**: Set up for better deliverability
3. **Compliance**: Ensure TCPA compliance for healthcare
4. **Rate Limiting**: Implement appropriate rate limits

### Security Best Practices
1. **Environment Variables**: Never commit API keys to code
2. **Webhook Security**: Verify webhook signatures
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Monitoring**: Set up alerts for failed deliveries

## Cost Optimization

### SendGrid Pricing
- **Free Tier**: 100 emails/day
- **Essentials**: $19.95/month for 50K emails
- **Pro**: $89.95/month for 100K emails
- **Overages**: $0.00075 per email

### Twilio Pricing
- **SMS**: $0.0075 per message (US)
- **Phone Number**: $1.00/month
- **Free Trial**: $15 credit

### Cost-Saving Tips
1. **Use Templates**: Reduce API calls with templates
2. **Batch Sending**: Send multiple messages in one request
3. **Rate Limiting**: Prevent unnecessary API calls
4. **Monitoring**: Track usage to avoid overages

## Troubleshooting

### Common SendGrid Issues
1. **Authentication Failed**: Check API key format
2. **Sender Not Verified**: Verify sender identity
3. **High Bounce Rate**: Clean email lists
4. **Spam Folder**: Set up domain authentication

### Common Twilio Issues
1. **Invalid Phone Number**: Check number format (+1234567890)
2. **Insufficient Credits**: Add funds to account
3. **Rate Limited**: Implement proper rate limiting
4. **Delivery Failed**: Check carrier restrictions

## Monitoring and Analytics

### SendGrid Analytics
- Delivery rates
- Open rates
- Click rates
- Bounce rates
- Spam reports

### Twilio Analytics
- Delivery status
- Error codes
- Cost tracking
- Usage statistics

## Support Resources

### SendGrid
- [Documentation](https://docs.sendgrid.com)
- [Status Page](https://status.sendgrid.com)
- [Support](https://support.sendgrid.com)

### Twilio
- [Documentation](https://www.twilio.com/docs)
- [Status Page](https://status.twilio.com)
- [Support](https://support.twilio.com)

## Next Steps

1. Set up your accounts and get credentials
2. Configure environment variables
3. Test the integration
4. Set up webhooks for delivery tracking
5. Implement monitoring and alerts
6. Configure production settings
7. Set up cost monitoring

Your communication system is now ready to handle both email and SMS notifications for your patient management application!
