# Transfer Approval System

This document describes the new transfer approval system that has been implemented to enhance the patient management workflow.

## Overview

The transfer approval system implements a comprehensive workflow where:
1. **Managers** create transfer requests
2. **Admins** receive email and SMS notifications for approval
3. **Admins** can approve or reject transfers via email links or API calls
4. **Approved transfers** are published to employees for assignment
5. **All parties** receive appropriate notifications throughout the process

## System Architecture

### Core Components

1. **Admin Service** (`src/lib/admin-service.ts`)
   - Manages admin user identification and contact information
   - Provides functions to get admin users and verify admin privileges

2. **Transfer Notification Service** (`src/lib/communication/transfer-notification-service.ts`)
   - Handles comprehensive email and SMS notifications
   - Manages notifications for transfer requests, approvals, and rejections

3. **Approval API Endpoints**
   - `POST/GET /api/transfers/[transferId]/approve` - Approve transfers
   - `POST/GET /api/transfers/[transferId]/reject` - Reject transfers

4. **Enhanced Transfer Creation** (`src/app/api/transfers/route.ts`)
   - Modified to send notifications to admins when transfers are created

## Workflow

### 1. Transfer Creation
When a manager creates a transfer request:

```typescript
// Transfer is created with status 'pending'
const transfer = new Transfer({
  transferId: 'TRF-ABC123',
  patientInfo: { /* patient details */ },
  fromHospital: fromHospitalId,
  toHospital: toHospitalId,
  status: 'pending',
  // ... other fields
});

// Admin receives email and SMS notifications
await TransferNotificationService.sendNewTransferRequestNotification(transfer, manager);
```

### 2. Admin Notification
Admins receive:
- **Email**: Detailed HTML email with transfer information and approval/rejection links
- **SMS**: Concise SMS with transfer details and action links

### 3. Admin Approval/Rejection
Admins can approve or reject transfers via:

#### Email Links
- **Approve**: `https://yourdomain.com/api/transfers/{transferId}/approve?admin={adminEmail}`
- **Reject**: `https://yourdomain.com/api/transfers/{transferId}/reject?admin={adminEmail}`

#### API Calls
```typescript
// Approve transfer
POST /api/transfers/{transferId}/approve
{
  "adminEmail": "admin@patients-management.com",
  "reason": "Approved by administrator"
}

// Reject transfer
POST /api/transfers/{transferId}/reject
{
  "adminEmail": "admin@patients-management.com",
  "reason": "Rejected due to capacity constraints"
}
```

### 4. Employee Publishing
When a transfer is approved:
- Transfer status changes to `accepted`
- Manager who requested the transfer receives notification
- All employees receive notification about the new available transfer

## Configuration

### Environment Variables

Create a `.env.local` file with the following configuration:

```bash
# Admin Configuration
ADMIN_EMAIL=admin@patients-management.com
ADMIN_PHONE=+15140000000
ADMIN_NAME=System Administrator

# Communication Configuration
COMMUNICATION_ENABLED=true
EMAIL_ENABLED=true
SMS_ENABLED=true

# Email Provider (SendGrid example)
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@patientsmanagement.com
EMAIL_FROM_NAME=Patient Management System
SENDGRID_API_KEY=your-sendgrid-api-key

# SMS Provider (Twilio example)
SMS_PROVIDER=twilio
SMS_FROM_NUMBER=+1234567890
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
```

### Admin User Setup

Run the setup script to create the admin user:

```bash
npm run setup-admin
```

This will:
- Create an admin user with the specified email and phone
- Verify the admin user is properly configured
- Test the admin service functions

## Testing

### Test the Complete Flow

```bash
# Test the entire transfer workflow
npm run test-transfer-flow
```

This script will:
1. Verify admin user exists
2. Create test manager and hospitals
3. Create a test transfer
4. Test admin notifications
5. Test transfer approval
6. Test employee notifications

### Test API Endpoints

```bash
# Test API endpoint functionality
npm run test-api
```

This script will:
1. Test admin service functions
2. Test transfer approval/rejection logic
3. Generate notification URLs
4. Verify system readiness

## Usage Examples

### Creating a Transfer (Manager)

```typescript
// Frontend form submission
const transferData = {
  patientFirstName: 'John',
  patientLastName: 'Doe',
  patientAge: 45,
  patientDossierNumber: '2024-001',
  fromHospital: 'Hospital A',
  toHospital: 'Hospital B',
  transferDate: '2024-01-15',
  transferTime: '14:00',
  priority: 'medium',
  reason: 'Specialized care required'
};

const response = await fetch('/api/transfers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(transferData)
});
```

### Approving a Transfer (Admin)

```typescript
// Via API call
const response = await fetch(`/api/transfers/${transferId}/approve`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    adminEmail: 'admin@patients-management.com',
    reason: 'Approved by administrator'
  })
});

// Via email link (automatic redirect)
// User clicks link in email, gets redirected to dashboard
```

### Checking Transfer Status

```typescript
// Get transfer details
const response = await fetch(`/api/transfers/${transferId}`);
const transfer = await response.json();

console.log(`Transfer ${transfer.transferId} is ${transfer.status}`);
```

## Notification Templates

### Email Templates

The system includes rich HTML email templates for:
- **Transfer Request**: Detailed transfer information with approval/rejection buttons
- **Transfer Approved**: Notification to manager and employees
- **Transfer Rejected**: Notification to manager with rejection reason

### SMS Templates

Concise SMS messages for:
- **Transfer Request**: Key details with action links
- **Transfer Approved**: Confirmation to relevant parties
- **Transfer Rejected**: Rejection notification with reason

## Security

### Admin Verification

The system verifies admin privileges by checking:
- User type is 'manager'
- User status is 'approved'
- Email contains admin pattern or post contains 'administrator'

### API Security

- Admin email verification for all approval/rejection actions
- Transfer status validation (only pending transfers can be approved/rejected)
- Proper error handling and logging

## Monitoring and Logging

### Logging

The system logs:
- Transfer creation events
- Admin notification attempts
- Approval/rejection actions
- Notification delivery status

### Error Handling

- Graceful handling of notification failures
- Fallback mechanisms for missing admin users
- Comprehensive error logging

## Troubleshooting

### Common Issues

1. **Admin not receiving notifications**
   - Check email/SMS provider configuration
   - Verify admin user exists and is approved
   - Check communication service logs

2. **Approval links not working**
   - Verify NEXTAUTH_URL is set correctly
   - Check admin email parameter in URL
   - Ensure transfer is still pending

3. **Notifications not being sent**
   - Check COMMUNICATION_ENABLED setting
   - Verify provider credentials
   - Check service logs for errors

### Debug Commands

```bash
# Check admin setup
npm run setup-admin

# Test notification system
npm run test-transfer-flow

# Verify API endpoints
npm run test-api

# Check database status
npm run db-stats
```

## Future Enhancements

### Planned Features

1. **Bulk Approval**: Approve multiple transfers at once
2. **Approval Delegation**: Allow admins to delegate approval rights
3. **Approval Workflows**: Multi-step approval processes
4. **Notification Preferences**: User-configurable notification settings
5. **Approval Analytics**: Track approval times and patterns

### Integration Opportunities

1. **Calendar Integration**: Sync approved transfers with calendar systems
2. **External Systems**: Integrate with hospital management systems
3. **Mobile App**: Native mobile app for admin approvals
4. **Webhook Support**: Real-time notifications to external systems

## Support

For technical support or questions about the transfer approval system:

1. Check the logs for error messages
2. Run the test scripts to verify system health
3. Review the configuration settings
4. Consult this documentation for troubleshooting steps

The system is designed to be robust and self-healing, with comprehensive error handling and fallback mechanisms to ensure reliable operation.
