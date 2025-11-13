# Communication System

This document describes the communication system implementation for the Patient Management application, including email and SMS services with multiple provider support.

## Overview

The communication system provides a unified interface for sending emails and SMS messages through various providers. It integrates with the existing notification system to deliver notifications via multiple channels based on user preferences.

## Architecture

### Core Components

1. **Communication Types** (`src/types/communication-types.ts`)
   - TypeScript interfaces and types for the communication system
   - Defines message structures, providers, and configuration

2. **Configuration** (`src/lib/communication-config.ts`)
   - Environment-based configuration management
   - Provider-specific settings and validation

3. **Email Service** (`src/lib/communication/email-service.ts`)
   - Email sending with multiple provider support
   - Template rendering and bulk sending

4. **SMS Service** (`src/lib/communication/sms-service.ts`)
   - SMS sending with multiple provider support
   - Phone number formatting and validation

5. **Main Communication Service** (`src/lib/communication/communication-service.ts`)
   - Unified interface for all communication channels
   - Integration with notification system

6. **Notification Integration** (`src/lib/communication/notification-integration.ts`)
   - Bridges communication system with existing notifications
   - Handles user preferences and delivery tracking

## Supported Providers

### Email Providers
- **SendGrid** - Cloud-based email delivery
- **AWS SES** - Amazon Simple Email Service
- **Mailgun** - Email API service
- **Resend** - Modern email API
- **Nodemailer** - SMTP-based email sending

### SMS Providers
- **Twilio** - Cloud communications platform
- **AWS SNS** - Amazon Simple Notification Service
- **MessageBird** - Global messaging platform
- **Vonage** - Communication APIs
- **Plivo** - Cloud communications platform

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Communication System
COMMUNICATION_ENABLED=true
EMAIL_ENABLED=true
SMS_ENABLED=true

# Email Configuration
EMAIL_PROVIDER=nodemailer
EMAIL_FROM=noreply@patientsmanagement.com
EMAIL_FROM_NAME=Patient Management System

# SMTP Configuration (for nodemailer)
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USERNAME=your-username
SMTP_PASSWORD=your-password

# SendGrid Configuration
SENDGRID_API_KEY=your-sendgrid-api-key

# AWS SES Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# SMS Configuration
SMS_PROVIDER=twilio
SMS_FROM_NUMBER=+1234567890

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
```

## Usage

### Basic Email Sending

```typescript
import CommunicationService from '@/lib/communication/communication-service';

const communicationService = new CommunicationService();

const emailMessage = {
  id: 'email_123',
  channel: 'email',
  priority: 'medium',
  status: 'pending',
  recipient: {
    email: 'user@example.com',
    name: 'John Doe',
  },
  content: {
    subject: 'Test Email',
    text: 'This is a test email',
    html: '<p>This is a test email</p>',
  },
  metadata: {
    source: 'api',
    category: 'test',
  },
  tracking: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const response = await communicationService.sendEmail(emailMessage);
```

### Basic SMS Sending

```typescript
const smsMessage = {
  id: 'sms_123',
  channel: 'sms',
  priority: 'high',
  status: 'pending',
  recipient: {
    phone: '+1234567890',
    name: 'John Doe',
  },
  content: {
    text: 'This is a test SMS message',
  },
  metadata: {
    source: 'api',
    category: 'test',
  },
  tracking: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const response = await communicationService.sendSMS(smsMessage);
```

### Using Templates

```typescript
// Render a template
const renderedContent = await communicationService.renderTemplate(
  'transfer_notification',
  {
    patientName: 'John Smith',
    fromHospital: 'City Hospital',
    toHospital: 'Regional Medical Center',
    status: 'In Progress',
    priority: 'High',
  }
);

// Use rendered content in message
const emailMessage = {
  // ... other fields
  content: renderedContent,
};
```

### Integration with Notifications

```typescript
import NotificationIntegrationService from '@/lib/communication/notification-integration';

const notificationService = new NotificationIntegrationService();

// Send notification via communication channels
const results = await notificationService.sendNotificationViaCommunication(
  notification,
  ['email', 'sms']
);

// Send urgent notification
const urgentResults = await notificationService.sendUrgentNotification(notification);
```

## API Endpoints

### Send Communication
```
POST /api/communication/send
```

**Request Body:**
```json
{
  "channel": "email",
  "recipient": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  "content": {
    "subject": "Test Email",
    "text": "This is a test email",
    "html": "<p>This is a test email</p>"
  },
  "metadata": {
    "category": "test"
  },
  "priority": "medium"
}
```

### Get Templates
```
GET /api/communication/templates?channel=email&category=transfer
```

### Render Template
```
POST /api/communication/templates
```

**Request Body:**
```json
{
  "templateId": "transfer_notification",
  "data": {
    "patientName": "John Smith",
    "fromHospital": "City Hospital",
    "toHospital": "Regional Medical Center",
    "status": "In Progress"
  }
}
```

## Templates

The system includes built-in templates for common use cases:

### Email Templates

**Transfer Templates:**
- `transfer_request_email` - New transfer request notifications
- `transfer_approved_email` - Transfer approval notifications
- `transfer_rejected_email` - Transfer rejection notifications
- Transfer templates are located in `src/lib/communication/templates/files/email/transfer/`

**Auth Templates:**
- `password_reset_email` - Password reset emails
- `email_verification_email` - Email verification code emails
- Auth templates are located in `src/lib/communication/templates/files/email/auth/`

**User Templates:**
- `user_approval_request_email` - User approval request emails (sent to admin)
- `account_approved_email` - Account approved notification emails
- `account_rejected_email` - Account rejected notification emails
- User templates are located in `src/lib/communication/templates/files/email/user/`

### SMS Templates
- `new_transfer_request_sms` - New transfer request notifications
- `transfer_approved_sms` - Transfer approved notifications
- `transfer_rejected_sms` - Transfer rejected notifications
- `transfer_accepted_sms` - Transfer accepted notifications
- `transfer_completed_sms` - Transfer completed notifications
- `urgent_transfer_sms` - Urgent transfer alerts
- `system_maintenance_sms` - System maintenance notifications
- `password_reset_sms` - Password reset codes

All templates use Handlebars syntax for variable substitution. See [TEMPLATE_SYSTEM_README.md](./TEMPLATE_SYSTEM_README.md) for detailed documentation.

## Features

### Multi-Provider Support
- Easy switching between providers via configuration
- Provider-specific optimizations and features
- Cost tracking and analytics

### Template System
- Reusable message templates
- Variable substitution
- Channel-specific templates

### Delivery Tracking
- Message status tracking
- Delivery confirmation
- Failure handling and retry logic

### User Preferences
- Per-user communication preferences
- Channel-specific settings
- Notification type filtering

### Analytics
- Delivery rates and statistics
- Cost tracking by channel
- Performance metrics

### Rate Limiting
- Configurable rate limits
- Provider-specific limits
- Automatic throttling

## Error Handling

The system includes comprehensive error handling:

- Provider-specific error handling
- Retry logic with exponential backoff
- Fallback providers
- Detailed error logging

## Security

- Input validation and sanitization
- Secure credential management
- Rate limiting to prevent abuse
- Audit logging

## Monitoring

- Delivery status tracking
- Performance metrics
- Error rate monitoring
- Cost tracking

## Development

### Adding New Providers

1. Create a new provider class extending `BaseEmailProvider` or `BaseSMSProvider`
2. Implement required methods: `send`, `getStatus`, `validateConfiguration`, `getCostEstimate`
3. Add provider configuration to `communication-config.ts`
4. Register provider in service initialization

### Adding New Templates

1. Add template to the appropriate service's `getDefaultTemplates` method
2. Define template variables and content
3. Test template rendering with sample data

### Testing

```bash
# Test email sending
npm run test:communication:email

# Test SMS sending
npm run test:communication:sms

# Test template rendering
npm run test:communication:templates
```

## Production Considerations

1. **Provider Selection**: Choose providers based on your requirements:
   - **Email**: SendGrid for high volume, AWS SES for cost efficiency
   - **SMS**: Twilio for reliability, AWS SNS for cost efficiency

2. **Monitoring**: Set up monitoring for:
   - Delivery rates
   - Error rates
   - Cost tracking
   - Provider performance

3. **Scaling**: Consider:
   - Queue-based processing for high volume
   - Provider failover
   - Rate limiting
   - Caching

4. **Security**: Ensure:
   - Secure credential storage
   - Input validation
   - Rate limiting
   - Audit logging

## Troubleshooting

### Common Issues

1. **Provider Authentication Errors**
   - Check API keys and credentials
   - Verify provider configuration
   - Test with provider's test endpoints

2. **Delivery Failures**
   - Check recipient addresses/phone numbers
   - Verify provider limits and quotas
   - Review error logs for specific issues

3. **Template Rendering Issues**
   - Verify template variables match data
   - Check template syntax
   - Test with sample data

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=communication:*
```

This will provide detailed logging for troubleshooting communication issues.
