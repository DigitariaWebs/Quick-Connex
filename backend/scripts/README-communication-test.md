# Communication Module Test Script

A comprehensive test script for the Communication Module that allows you to test email and SMS functionality with flexible recipient selection.

## Quick Start

```bash
# Test with specific recipients
npm run test:communication -- --email=test@example.com --phone=+1234567890

# Test only email
npm run test:communication -- --email=test@example.com --email-only

# Test only SMS
npm run test:communication -- --phone=+1234567890 --sms-only

# Test with verbose output
npm run test:communication -- --email=test@example.com --phone=+1234567890 --verbose
```

## Usage

### Basic Usage

```bash
# TypeScript version (recommended)
npm run test:communication

# JavaScript version
npm run test:communication:js

# Direct execution
npx ts-node scripts/test-communication.ts
node scripts/test-communication.js
```

### Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--email=ADDRESS` | Email address to send test emails to | `--email=test@example.com` |
| `--phone=NUMBER` | Phone number to send test SMS to (E.164 format) | `--phone=+1234567890` |
| `--email-only` | Test only email functionality | `--email-only` |
| `--sms-only` | Test only SMS functionality | `--sms-only` |
| `--integrations-only` | Test only integration services | `--integrations-only` |
| `--verbose`, `-v` | Show detailed output | `--verbose` |
| `--help`, `-h` | Show help message | `--help` |

### Examples

```bash
# Test with specific recipients
npm run test:communication -- --email=test@example.com --phone=+1234567890

# Test only email with verbose output
npm run test:communication -- --email=test@example.com --email-only --verbose

# Test only SMS
npm run test:communication -- --phone=+1234567890 --sms-only

# Test integrations only
npm run test:communication -- --integrations-only

# Interactive mode (will prompt for email/phone)
npm run test:communication
```

## Environment Variables

The test script requires the following environment variables to be set:

### Required Variables

```bash
# Email Configuration
EMAIL_PROVIDER=nodemailer
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME="Test System"

# SMS Configuration
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
SMS_FROM_NUMBER=+1234567890
```

### Optional Variables

```bash
# Email Reply-To (optional)
EMAIL_REPLY_TO=support@hospital.com

# SMTP Security (optional)
SMTP_SECURE=false
SMTP_TLS_REJECT_UNAUTHORIZED=true
```

## Test Features

### 1. Email Testing
- Sends a test email with HTML content
- Tests Nodemailer SMTP provider
- Validates email format and delivery
- Shows detailed results with message IDs

### 2. SMS Testing
- Sends a test SMS message
- Tests Twilio SMS provider
- Validates phone number format (E.164)
- Shows delivery status and costs

### 3. Integration Services Testing
- Tests `TransferNotificationService`
- Tests `UserNotificationService`
- Tests `NotificationIntegrationService`
- Validates service initialization

### 4. Provider Health Check
- Checks email provider health
- Checks SMS provider health
- Validates configuration
- Reports connection status

## Test Output

### Success Example

```
🚀 Communication Module Test Suite
=====================================

📋 Test Configuration:
   📧 Email: test@example.com
   📱 Phone: +1234567890
   📧 Test Email: Yes
   📱 Test SMS: Yes
   🔗 Test Integrations: Yes
   🔍 Verbose: No

🔧 Environment Check:
   ✅ All required environment variables are set

🔧 Initializing Services...
   ✅ CommunicationService initialized
   ✅ TransferNotificationService initialized
   ✅ UserNotificationService initialized
   ✅ NotificationIntegrationService initialized

🏥 Testing Provider Health...
   ✅ All providers are healthy

📧 Testing Email Functionality...
   ✅ Email sent successfully!

📱 Testing SMS Functionality...
   ✅ SMS sent successfully!

🔗 Testing Integration Services...
   📋 Testing TransferNotificationService...
     ✅ TransferNotificationService test completed
   👤 Testing UserNotificationService...
     ✅ UserNotificationService test completed
   🔔 Testing NotificationIntegrationService...
     ✅ NotificationIntegrationService test completed

📊 Test Results Summary
========================
   🏥 Provider Health: ✅ PASS
   📧 Email Test: ✅ PASS
   📱 SMS Test: ✅ PASS
   🔗 Integration Tests: ✅ PASS

🎉 All tests passed! Communication module is working correctly.
```

### Failure Example

```
❌ Configuration errors:
   - Email address is required for email testing
   - Phone number is required for SMS testing

❌ Missing environment variables:
   - SMTP_USERNAME
   - TWILIO_ACCOUNT_SID
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   ❌ Missing environment variables:
      - SMTP_USERNAME
      - TWILIO_ACCOUNT_SID
   ```
   **Solution**: Set all required environment variables in your `.env` file

2. **Invalid Email Format**
   ```
   ❌ Configuration errors:
      - Invalid email address format
   ```
   **Solution**: Use a valid email format like `test@example.com`

3. **Invalid Phone Format**
   ```
   ❌ Configuration errors:
      - Invalid phone number format (use E.164 format: +1234567890)
   ```
   **Solution**: Use E.164 format like `+1234567890`

4. **SMTP Authentication Failed**
   ```
   ❌ Email sending failed
   🚨 Error: Invalid login: 535-5.7.8 Username and Password not accepted
   ```
   **Solution**: 
   - Enable 2-factor authentication on Gmail
   - Generate an App Password
   - Use the App Password as `SMTP_PASSWORD`

5. **Twilio Authentication Failed**
   ```
   ❌ SMS sending failed
   🚨 Error: Authentication Error - No credentials provided
   ```
   **Solution**: Check your Twilio Account SID and Auth Token

### Debug Mode

Use `--verbose` flag for detailed debugging:

```bash
npm run test:communication -- --email=test@example.com --phone=+1234567890 --verbose
```

This will show:
- Detailed provider information
- Message IDs and provider IDs
- Cost information
- Stack traces for errors

## Gmail Setup

### 1. Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Follow the setup process

### 2. Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" as the app
3. Generate a 16-character password
4. Use this password as `SMTP_PASSWORD`

### 3. Environment Variables
```bash
EMAIL_PROVIDER=nodemailer
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-gmail@gmail.com
SMTP_PASSWORD=your-16-character-app-password
EMAIL_FROM=your-gmail@gmail.com
EMAIL_FROM_NAME="Test System"
```

## Twilio Setup

### 1. Create Twilio Account
1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up for a free account
3. Verify your phone number

### 2. Get Credentials
1. Go to [Account Dashboard](https://console.twilio.com/us1/account/keys-credentials)
2. Copy your Account SID and Auth Token
3. Purchase a phone number for sending SMS

### 3. Environment Variables
```bash
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
SMS_FROM_NUMBER=+1234567890
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Test Communication Module
on: [push, pull_request]

jobs:
  test-communication:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:communication -- --email=${{ secrets.TEST_EMAIL }} --phone=${{ secrets.TEST_PHONE }}
        env:
          EMAIL_PROVIDER: nodemailer
          SMTP_HOST: smtp.gmail.com
          SMTP_USERNAME: ${{ secrets.SMTP_USERNAME }}
          SMTP_PASSWORD: ${{ secrets.SMTP_PASSWORD }}
          EMAIL_FROM: ${{ secrets.EMAIL_FROM }}
          TWILIO_ACCOUNT_SID: ${{ secrets.TWILIO_ACCOUNT_SID }}
          TWILIO_AUTH_TOKEN: ${{ secrets.TWILIO_AUTH_TOKEN }}
          SMS_FROM_NUMBER: ${{ secrets.SMS_FROM_NUMBER }}
```

## Customization

### Adding New Tests

You can extend the test script by adding new test functions:

```typescript
// Test custom functionality
async function testCustomFeature(communicationService: CommunicationService, verbose: boolean): Promise<boolean> {
  console.log('\n🔧 Testing Custom Feature...');
  
  try {
    // Your custom test logic here
    console.log('   ✅ Custom feature test passed');
    return true;
  } catch (error) {
    console.log('   ❌ Custom feature test failed');
    console.log(`   🚨 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}
```

### Modifying Test Messages

You can customize the test email and SMS content by editing the respective functions in the script.

## Support

If you encounter issues with the test script:

1. Check the environment variables
2. Verify Gmail/Twilio credentials
3. Use `--verbose` flag for detailed output
4. Check the logs for specific error messages
5. Ensure all dependencies are installed

For more help, refer to the main Communication Module documentation.
