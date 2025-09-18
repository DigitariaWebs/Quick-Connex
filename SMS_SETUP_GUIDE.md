# SMS Setup Guide for Transfer Workflow

This guide will help you set up SMS notifications for your patient transfer workflow.

## Overview

The SMS system sends notifications at key points in the transfer workflow:

1. **New Transfer Request** → SMS to Admins (for approval)
2. **Transfer Approved** → SMS to Manager + Employees
3. **Transfer Accepted** → SMS to Manager
4. **Transfer Completed** → SMS to Manager

## Quick Setup (Free Option)

### 1. Get Twilio Free Trial
1. Go to [twilio.com](https://twilio.com)
2. Sign up for free account
3. Get $15 credit (≈2,000 SMS messages)
4. Verify your phone number

### 2. Get Twilio Credentials
1. Go to Console Dashboard
2. Copy your Account SID (starts with `AC`)
3. Copy your Auth Token (click to reveal)
4. Buy a phone number (~$1/month)

### 3. Configure Environment Variables
Add these to your `.env` file:

```bash
# SMS Configuration
SMS_ENABLED=true
SMS_PROVIDER=twilio
SMS_FROM_NUMBER=+1234567890

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token-here
```

### 4. Test the Setup
```bash
# Run the SMS test script
node scripts/test-sms-system.js
```

## SMS Templates

The system includes these SMS templates:

### New Transfer Request
```
🆕 New transfer request: John Doe (45y) from City Hospital to Regional Medical Center. Priority: urgent. Requested by: Dr. Smith
```

### Transfer Approved
```
✅ Transfer approved: John Doe from City Hospital to Regional Medical Center. Transfer ID: TRF-123456. Please check dashboard for details.
```

### Transfer Accepted
```
👤 Transfer accepted: John Doe from City Hospital to Regional Medical Center. Accepted by: Jane Employee. Transfer ID: TRF-123456
```

### Transfer Completed
```
✅ Transfer completed: John Doe from City Hospital to Regional Medical Center. Completed by: Jane Employee. Duration: 2h 30m
```

### Urgent Transfer Alert
```
🚨 URGENT TRANSFER: John Doe (45y) needs immediate transfer from City Hospital to Regional Medical Center. Priority: urgent. Requested by: Dr. Smith
```

## Workflow Integration

### 1. Manager Creates Transfer
- **Endpoint**: `POST /api/transfers`
- **SMS Sent**: To all admins
- **Template**: `new_transfer_request_sms` or `urgent_transfer_alert_sms`

### 2. Admin Approves Transfer
- **Endpoint**: `PUT /api/transfers/[id]/approve`
- **SMS Sent**: To manager + all employees
- **Template**: `transfer_approved_sms`

### 3. Employee Accepts Transfer
- **Endpoint**: `PUT /api/transfers/[id]/accept`
- **SMS Sent**: To manager
- **Template**: `transfer_accepted_sms`

### 4. Employee Completes Transfer
- **Endpoint**: `PUT /api/transfers/[id]/complete`
- **SMS Sent**: To manager
- **Template**: `transfer_completed_sms`

## User Requirements

For SMS to work, users need:
- **Phone number** in their profile
- **Approved status**
- **Correct user type** (admin, manager, employee)

## Testing

### Manual Test
```bash
# Test SMS sending directly
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
    }
  }'
```

### Automated Test
```bash
# Run the full workflow test
node scripts/test-sms-system.js
```

## Cost Optimization

### Free Options
1. **Twilio Free Trial**: $15 credit (≈2,000 SMS)
2. **Textbelt**: 1 SMS/day (testing only)
3. **Mtalkz**: 50,000 free credits (one-time)

### Production Recommendations
1. **Twilio**: Best for healthcare (HIPAA compliant)
2. **AWS SNS**: Cost-effective for high volume
3. **Vonage**: Good alternative to Twilio

## Troubleshooting

### Common Issues

1. **SMS not sending**
   - Check Twilio credentials
   - Verify phone number format (+1234567890)
   - Check user has phone number in profile

2. **Template not found**
   - Templates are auto-loaded on service start
   - Check console for template loading errors

3. **User not receiving SMS**
   - Verify user status is 'approved'
   - Check user has phone number
   - Verify user type is correct

### Debug Mode
Enable debug logging:
```bash
DEBUG=communication:* npm run dev
```

## Production Setup

### 1. Twilio Production
- Set up domain authentication
- Configure webhooks for delivery tracking
- Set up monitoring and alerts
- Consider HIPAA compliance

### 2. Rate Limiting
- Implement rate limiting to prevent abuse
- Set up cost monitoring
- Configure delivery tracking

### 3. Monitoring
- Track delivery rates
- Monitor error rates
- Set up alerts for failures

## Security

- Never commit API keys to code
- Use environment variables
- Implement rate limiting
- Monitor usage and costs

## Support

- **Twilio**: [docs.twilio.com](https://docs.twilio.com)
- **AWS SNS**: [docs.aws.amazon.com/sns](https://docs.aws.amazon.com/sns)
- **Vonage**: [developer.vonage.com](https://developer.vonage.com)

Your SMS system is now ready to handle transfer notifications! 🚀
