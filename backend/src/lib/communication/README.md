# Communication Module - Backend

Complete communication system for email and SMS messaging with multi-provider support.

## Features

- ✅ **Email Support**: SendGrid, Nodemailer, Gmail SMTP
- ✅ **SMS Support**: Twilio
- ✅ **Multi-Channel**: Email, SMS, with extensible architecture
- ✅ **Provider Management**: Dynamic loading, health checking, failover
- ✅ **Rate Limiting**: Exponential backoff, retry logic
- ✅ **Cost Tracking**: Estimate and track messaging costs
- ✅ **Event System**: Track message lifecycle events
- ✅ **Template Engine**: Handlebars-based template rendering
- ✅ **Type Safety**: Full TypeScript support
- ✅ **Error Handling**: Comprehensive error management with recovery suggestions

## Quick Start

### Installation

```bash
npm install @sendgrid/mail nodemailer twilio handlebars
```

### Configuration

Set environment variables:

```env
# Service Configuration
COMMUNICATION_ENABLED=true
EMAIL_ENABLED=true
SMS_ENABLED=true

# Email Provider
EMAIL_PROVIDER=nodemailer
EMAIL_FROM=noreply@example.com
EMAIL_FROM_NAME=My App

# SMTP (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SMS Provider
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
SMS_FROM_NUMBER=+1234567890
```

### Usage

```typescript
import { initializeCommunicationService, EmailMessage } from './lib/communication';

// Initialize
const commService = await initializeCommunicationService();

// Send Email
const email: EmailMessage = {
  id: 'msg_123',
  channel: 'email',
  priority: 'medium',
  status: 'pending',
  recipient: {
    email: 'user@example.com',
    name: 'John Doe'
  },
  content: {
    subject: 'Welcome',
    text: 'Welcome to our service!',
    html: '<h1>Welcome!</h1>'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

const response = await commService.sendEmail(email);

// Send SMS
const sms: SMSMessage = {
  id: 'sms_123',
  channel: 'sms',
  priority: 'high',
  status: 'pending',
  recipient: {
    phone: '+1234567890',
    name: 'Jane Doe'
  },
  content: {
    text: 'Your verification code is 123456'
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

const smsResponse = await commService.sendSMS(sms);
```

## Architecture

```
lib/communication/
├── core/                 # Core service & configuration
│   ├── CommunicationService.ts
│   ├── config.ts
│   └── constants.ts
├── providers/           # Provider implementations
│   ├── manager.ts
│   ├── email/
│   │   ├── EmailProvider.ts
│   │   ├── SendGridProvider.ts
│   │   ├── NodemailerProvider.ts
│   │   └── GmailSMTPProvider.ts
│   └── sms/
│       ├── SMSProvider.ts
│       └── TwilioProvider.ts
├── utils/              # Utility functions
│   ├── helpers.ts
│   ├── rate-limiter.ts
│   ├── cost-calculator.ts
│   └── formatters.ts
├── errors/            # Error handling
│   ├── error-types.ts
│   └── error-handler.ts
├── events/            # Event system
│   ├── registry.ts
│   └── handlers.ts
├── templates/         # Template system
│   ├── core/TemplateLoader.ts
│   ├── email-templates.ts
│   └── sms-templates.ts
└── index.ts          # Main exports
```

## API Reference

### CommunicationService

Main service class for all communication operations.

#### Methods

- `sendEmail(message: EmailMessage): Promise<CommunicationServiceResponse>`
- `sendSMS(message: SMSMessage): Promise<CommunicationServiceResponse>`
- `sendBatchMessages(messages: Array<EmailMessage | SMSMessage>): Promise<CommunicationServiceResponse[]>`
- `getUserPreferences(userId: string): Promise<UserCommunicationPreferences>`
- `updateUserPreferences(userId: string, preferences: UserCommunicationPreferences): Promise<void>`
- `getProviderHealth(): Promise<ProviderHealthStatus>`
- `getProviderStats(): Promise<ProviderStats>`
- `testProviderConnection(provider: string): Promise<boolean>`
- `getCostEstimate(provider: string, message: any): Promise<number>`

### Utilities

#### Validation
- `validateEmail(email: string): boolean`
- `validatePhoneNumber(phone: string): boolean`
- `validateEmailMessage(message: EmailMessage): ValidationResult`
- `validateSMSMessage(message: SMSMessage): ValidationResult`

#### Formatting
- `formatPhoneNumber(phone: string, countryCode?: string): string`
- `sanitizeHTML(html: string, options?: SanitizeOptions): string`
- `htmlToText(html: string): string`
- `formatSMSSegments(text: string): SMSSegmentInfo`

#### Cost Calculation
- `calculateEmailCost(message: EmailMessage, provider: EmailProvider): number`
- `calculateSMSCost(message: SMSMessage, provider: SMSProvider): number`
- `compareProviderCosts(channel: string, providers: string[], messageCount: number): CostComparison[]`

## Providers

### Email Providers

#### SendGrid
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-api-key
```

#### Nodemailer (SMTP)
```env
EMAIL_PROVIDER=nodemailer
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email
SMTP_PASSWORD=your-password
```

#### Gmail SMTP
```env
EMAIL_PROVIDER=gmail-smtp
GMAIL_EMAIL=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

### SMS Providers

#### Twilio
```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
SMS_FROM_NUMBER=+1234567890
```

## Events

The system emits events for message lifecycle tracking:

- `MESSAGE_SENT` - Message successfully sent
- `MESSAGE_DELIVERED` - Message delivered to recipient
- `MESSAGE_FAILED` - Message sending failed
- `MESSAGE_BOUNCED` - Message bounced
- `MESSAGE_READ` - Message read by recipient
- `MESSAGE_CLICKED` - Link in message clicked

Register custom event handlers:

```typescript
import { EventHandlerRegistry, CommunicationEventType } from './lib/communication';

class CustomHandler implements ICommunicationEventHandler {
  eventType = CommunicationEventType.MESSAGE_SENT;
  
  canHandle(eventType: CommunicationEventType): boolean {
    return eventType === CommunicationEventType.MESSAGE_SENT;
  }
  
  async handle(eventData: CommunicationEventData): Promise<void> {
    console.log('Message sent:', eventData);
  }
}

const registry = new EventHandlerRegistry();
registry.registerHandler(new CustomHandler());
```

## Templates

### Using Templates

```typescript
// Render email template
const content = await commService.renderTemplate('welcome_email', {
  userName: 'John Doe',
  activationLink: 'https://example.com/activate'
});

// Send templated email
const message: EmailMessage = {
  ...baseMessage,
  content
};

await commService.sendEmail(message);
```

### Template Variables

Templates use Handlebars syntax:

```html
<h1>Hello {{userName}}</h1>
<p>Click <a href="{{activationLink}}">here</a> to activate your account.</p>
```

## Error Handling

All operations return structured responses:

```typescript
interface CommunicationServiceResponse {
  success: boolean;
  messageId: string;
  providerId?: string;
  status: CommunicationStatus;
  error?: string;
  cost?: number;
  currency?: string;
}
```

Handle errors:

```typescript
const response = await commService.sendEmail(message);

if (!response.success) {
  console.error('Failed to send:', response.error);
  // Error contains recovery suggestions
}
```

## Rate Limiting

Built-in rate limiting with exponential backoff:

```typescript
const config = {
  rateLimiting: {
    enabled: true,
    maxPerMinute: 60,
    maxPerHour: 1000,
    maxPerDay: 10000
  }
};
```

## Cost Tracking

Track messaging costs:

```typescript
// Get cost estimate
const cost = await commService.getCostEstimate('sendgrid', emailMessage);
console.log(`Estimated cost: $${cost}`);

// Compare provider costs
const comparison = compareProviderCosts('email', ['sendgrid', 'ses'], 1000);
comparison.forEach(c => {
  console.log(`${c.provider}: $${c.estimatedCost}`);
});
```

## Testing

Mock providers for testing:

```typescript
jest.mock('./lib/communication/providers/email/SendGridProvider');

const mockProvider = {
  send: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'test_123',
    status: 'sent'
  })
};
```

## Contributing

When adding new providers:

1. Extend `BaseEmailProvider` or `BaseSMSProvider`
2. Implement required methods
3. Add provider to manager
4. Update configuration types
5. Add tests

## License

MIT

