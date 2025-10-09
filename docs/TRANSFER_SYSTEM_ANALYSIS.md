# Patient Management System - Transfer System Analysis

## Table of Contents
1. [System Overview](#system-overview)
2. [User Roles and Privileges](#user-roles-and-privileges)
3. [Transfer Data Models](#transfer-data-models)
4. [Transfer States and Workflow](#transfer-states-and-workflow)
5. [API Endpoints](#api-endpoints)
6. [Communication Services](#communication-services)
7. [Frontend Components](#frontend-components)
8. [Security and Permissions](#security-and-permissions)
9. [Configuration and Constants](#configuration-and-constants)

---

## System Overview

The Patient Management System implements a comprehensive transfer workflow for managing patient transfers between hospitals. The system supports role-based access control with three main user types: **Managers**, **Employees**, and **Admins**.

### Key Features
- **Role-based Transfer Creation**: Only managers can create transfer requests
- **Admin Approval Workflow**: All transfers require admin approval before being published to employees
- **Multi-channel Notifications**: Email and SMS notifications for all stakeholders
- **Real-time Updates**: WebSocket-based real-time notifications
- **Comprehensive Tracking**: Full audit trail with status history
- **Priority Management**: Two priority levels (low, urgent)
- **Hospital Integration**: Support for hospital references and autocomplete

---

## User Roles and Privileges

### 1. Manager Role
**Capabilities:**
- ✅ Create new transfer requests
- ✅ View all transfers (including pending ones)
- ✅ Edit pending transfers
- ✅ Cancel transfers (if not completed)
- ✅ View transfer statistics and analytics
- ✅ Access to transfer management dashboard

**Required Fields:**
- `post`: Manager's position/title
- `ciuss`: CIUSSS identifier (Quebec health region)
- `status`: Must be 'approved' to access system

**CIUSSS Values:**
```
'01', '02', '03', '04', '05', '06-1', '06-2', '06-3', '06-4', '06-5',
'07', '08', '09', '11-1', '11-2', '12', '13', '14', '15', '16-1', '16-2', '16-3'
```

### 2. Employee Role
**Capabilities:**
- ✅ View approved transfers only (not pending)
- ✅ Accept transfer assignments
- ✅ Update transfer status (start, complete)
- ✅ View assigned transfers
- ❌ Cannot create new transfers
- ❌ Cannot see pending transfers

**Required Documents:**
- CV (Curriculum Vitae)
- OPIQ Permit (Quebec nursing permit)
- RCR (Resuscitation certification)

### 3. Admin Role
**Capabilities:**
- ✅ Approve/reject transfer requests
- ✅ Access to all system data
- ✅ User management
- ✅ System configuration
- ✅ View all transfers regardless of status

**Admin Identification:**
- Admins are identified through the `AdminService.isAdmin()` method
- Admin contact information is retrieved via `AdminService.getAdminContactInfo()`

---

## Transfer Data Models

### Core Transfer Schema
```typescript
interface ITransfer {
  transferId: string;                    // Unique identifier (TRF-XXX format)
  patientInfo: {
    firstName: string;
    lastName: string;
    age: number;                        // 0-120 validation
    dossierNumber: string;              // Patient medical record number
  };
  fromHospital: ObjectId;               // Reference to Hospital model
  toHospital: ObjectId;                 // Reference to Hospital model
  fromHospitalName: string;             // Cached name for display
  toHospitalName: string;               // Cached name for display
  requestedBy: ObjectId;                // Reference to User (manager)
  assignedTo?: ObjectId;                // Reference to User (employee)
  reason: string;                       // Transfer reason (10-1000 chars)
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  requestedDate: Date;                  // When transfer was created
  scheduledDate?: Date;                 // Planned transfer date
  completedDate?: Date;                 // When transfer was completed
  notes?: string;                       // Additional notes
  medicalDocuments?: string[];          // File paths to medical documents
  
  // Scheduling Configuration
  scheduling: {
    transferTime: string;               // HH:MM format
  };
  
  // Status Tracking
  statusHistory: Array<{
    status: string;
    changedBy: ObjectId;
    changedAt: Date;
    reason?: string;
  }>;
  
  // Audit Fields
  lastModifiedBy: ObjectId;
  estimatedDuration?: number;           // in minutes
  actualDuration?: number;              // in minutes
  
  createdAt: Date;
  updatedAt: Date;
}
```

### User Schema
```typescript
interface IUser {
  userType: 'employee' | 'manager';
  firstName: string;
  lastName: string;
  email: string;                        // Unique, validated format
  phone: string;
  password: string;                     // Min 6 characters
  
  // Manager-specific fields
  post?: string;                        // Required for managers
  ciusss?: string;                      // Required for managers
  
  // Employee-specific fields
  documents?: IDocumentReference[];     // Required for employees
  
  // Approval system
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;                  // Admin email
  approvedAt?: Date;
  rejectionReason?: string;
  
  // Password reset
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Hospital Schema
```typescript
interface IHospital {
  name: string;                         // Hospital name
  address: string;                      // Physical address
  organization: {
    type: string;                       // Hospital type
    name: string;                       // Organization name
    region: string;                     // Geographic region
  };
  isActive: boolean;                    // Active status
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Transfer States and Workflow

### State Transitions
The system implements a strict state machine with the following valid transitions:

```
pending → accepted | cancelled
accepted → in_progress | cancelled
in_progress → completed | cancelled
completed → [terminal state]
cancelled → [terminal state]
```

### State Definitions

#### 1. PENDING
- **Description**: Initial state when transfer is created by manager
- **Visibility**: 
  - Managers: ✅ Can see and edit
  - Employees: ❌ Cannot see
  - Admins: ✅ Can see and approve/reject
- **Actions Available**:
  - Manager: Edit, Cancel
  - Admin: Approve, Reject
- **Notifications**: Email + SMS to admins for approval

#### 2. ACCEPTED
- **Description**: Transfer approved by admin, available for employee assignment
- **Visibility**: All user types can see
- **Actions Available**:
  - Employee: Accept assignment
  - Manager: Cancel
  - Admin: Cancel
- **Notifications**: Email + SMS to manager and all employees

#### 3. IN_PROGRESS
- **Description**: Transfer accepted by employee and started
- **Visibility**: All user types can see
- **Actions Available**:
  - Assigned Employee: Complete, Cancel
  - Manager: Cancel
  - Admin: Cancel
- **Notifications**: Status change notifications

#### 4. COMPLETED
- **Description**: Transfer successfully completed
- **Visibility**: All user types can see
- **Actions Available**: None (terminal state)
- **Notifications**: Completion notifications to manager

#### 5. CANCELLED
- **Description**: Transfer cancelled at any stage
- **Visibility**: All user types can see
- **Actions Available**: None (terminal state)
- **Notifications**: Cancellation notifications

### Priority Levels

#### LOW
- **Weight**: 1
- **Color**: Green
- **Description**: Non-urgent transfer
- **SMS Priority**: Medium

#### URGENT
- **Weight**: 2
- **Color**: Red
- **Description**: Urgent transfer - immediate attention required
- **SMS Priority**: Urgent
- **Special Handling**: Enhanced notifications, priority in queues

---

## API Endpoints

### Transfer Management

#### GET /api/transfers
**Purpose**: Retrieve transfers based on user role
**Authentication**: Required (Employee or Manager)
**Query Parameters**:
- `status`: Filter by status ('all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled')

**Response Logic**:
- **Employees**: Only see approved transfers (accepted, in_progress, completed, cancelled)
- **Managers**: See all transfers including pending ones

#### POST /api/transfers
**Purpose**: Create new transfer request
**Authentication**: Required (Manager only)
**Request Body**:
```typescript
{
  patientFirstName: string;
  patientLastName: string;
  patientAge: number;
  patientDossierNumber: string;
  fromHospital: string;                 // Hospital name
  toHospital: string;                   // Hospital name
  fromHospitalId?: string;              // Hospital ID (preferred)
  toHospitalId?: string;                // Hospital ID (preferred)
  transferDate: string;                 // YYYY-MM-DD format
  transferTime: string;                 // HH:MM format
  transferType: 'stat' | 'scheduled';
  issuer: 'gestionnaire' | 'assistant_chef' | 'coordonateur';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  notes?: string;
  medicalDocuments?: string[];
  scheduling?: {
    transferTime: string;
  };
}
```

**Response**: Transfer object with populated references

### Transfer Actions

#### GET/POST /api/transfers/[transferId]/approve
**Purpose**: Approve transfer request (Admin only)
**Authentication**: Admin verification required
**Parameters**:
- `admin`: Admin email
- `reason`: Approval reason (optional)

**Actions**:
1. Validates admin privileges
2. Updates transfer status to 'accepted'
3. Adds entry to status history
4. Sends notifications to manager and employees
5. Redirects to dashboard with success message

#### GET/POST /api/transfers/[transferId]/reject
**Purpose**: Reject transfer request (Admin only)
**Authentication**: Admin verification required
**Parameters**:
- `admin`: Admin email
- `reason`: Rejection reason (optional)

**Actions**:
1. Validates admin privileges
2. Updates transfer status to 'cancelled'
3. Adds entry to status history
4. Sends rejection notifications to manager
5. Redirects to dashboard with rejection message

### Calendar Integration

#### GET /api/calendar
**Purpose**: Retrieve calendar events for transfers
**Authentication**: Required
**Query Parameters**:
- `start`: Start date (ISO format)
- `end`: End date (ISO format)

#### POST /api/calendar
**Purpose**: Create calendar event for transfer
**Authentication**: Required

---

## Communication Services

### Email Service
**Provider Support**:
- SendGrid
- Gmail API
- Gmail SMTP
- AWS SES (planned)
- Mailgun (planned)
- Resend (planned)

**Templates Available**:
1. **New Transfer Request**: Rich HTML template with approval/rejection links
2. **Transfer Approved**: Notifications to manager and employees
3. **Transfer Rejected**: Rejection notification with reason
4. **Urgent Alert**: Special formatting for urgent transfers
5. **System Notification**: General system messages
6. **Password Reset**: Authentication-related emails

**Email Features**:
- Template rendering with dynamic data
- Priority-based styling (urgent transfers get red borders)
- Responsive design
- Action buttons for approval/rejection
- Rich formatting with gradients and icons

### SMS Service
**Provider Support**:
- Twilio (primary)
- AWS SNS
- MessageBird
- Vonage
- Plivo

**SMS Templates**:
1. **New Transfer Request**: Concise transfer details with action links
2. **Transfer Approved**: Approval notification
3. **Transfer Accepted**: Assignment confirmation
4. **Transfer Completed**: Completion notification
5. **Urgent Alert**: Priority SMS for urgent transfers
6. **System Notification**: General alerts
7. **Transfer Reminder**: Scheduled transfer reminders

**SMS Features**:
- International phone number formatting
- Character limit validation (1600 chars max)
- Priority-based delivery
- Cost tracking per message
- Delivery status tracking

### Notification Workflow

#### New Transfer Request
1. **Manager creates transfer** → Status: 'pending'
2. **System sends to Admins**:
   - Email: Rich HTML with transfer details and action buttons
   - SMS: Concise message with approval/rejection links
3. **Admin receives notifications** with direct action links

#### Transfer Approved
1. **Admin approves transfer** → Status: 'accepted'
2. **System sends to Manager**:
   - Email: Approval confirmation
   - SMS: Approval notification
3. **System sends to All Employees**:
   - Email: New transfer available notification
   - SMS: Transfer assignment opportunity

#### Transfer Rejected
1. **Admin rejects transfer** → Status: 'cancelled'
2. **System sends to Manager**:
   - Email: Rejection notification with reason
   - SMS: Rejection alert

---

## Frontend Components

### Main Pages

#### /transfers
**Purpose**: Main transfer management interface
**Features**:
- Transfer list with filtering and search
- Priority-based color coding
- Status indicators
- Real-time updates
- Role-based access control
- Floating action button for managers (create new transfer)

**Components Used**:
- `TransferRequestCard`: Individual transfer display
- `TransferFormModal`: Create new transfer modal
- `TransferTimeline`: Detailed transfer history
- `Sidebar`: Navigation and filters
- `DashboardHeader`: User info and actions

#### /dashboard
**Purpose**: User-specific dashboard
**Manager View**:
- Transfer creation form
- System-wide statistics
- Recent activity
- Quick actions

**Employee View**:
- Assigned transfers
- Available transfers
- Personal statistics
- Task queue

### Key Components

#### TransferForm
**Purpose**: Create new transfer requests
**Access**: Managers only
**Features**:
- Patient information section
- Hospital autocomplete (from/to)
- Date and time pickers
- Priority selection
- Transfer type selection
- Reason textarea
- Real-time validation
- Error handling and display

**Validation Rules**:
- Patient name: Required, non-empty
- Age: 1-120 years
- Dossier number: Alphanumeric with separators, 3-50 chars
- Hospitals: Must be different, must exist in system
- Date: Must be future date
- Time: Required
- Reason: 10-1000 characters

#### TransferRequestCard
**Purpose**: Display individual transfer information
**Features**:
- Priority color coding
- Status indicators
- Patient information
- Hospital route display
- Action buttons (Accept for employees)
- Click to view details
- Responsive design

**Actions Available**:
- **Employees**: Accept transfer (if status is 'accepted')
- **All Users**: View details (opens timeline)

#### TransferTimeline
**Purpose**: Detailed transfer history and status tracking
**Features**:
- Status history with timestamps
- User information for each change
- Reason tracking
- Visual timeline
- Close button

### UI/UX Features

#### Design System
- **Colors**: Priority-based color scheme
- **Typography**: Clear hierarchy with proper contrast
- **Spacing**: Consistent padding and margins
- **Shadows**: Subtle elevation for cards
- **Animations**: Smooth transitions and hover effects

#### Responsive Design
- Mobile-first approach
- Grid layouts that adapt to screen size
- Touch-friendly buttons and interactions
- Optimized for tablet and desktop use

#### Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Color contrast compliance
- Screen reader friendly

---

## Security and Permissions

### Authentication
- JWT-based authentication
- Session management with cookies
- Password reset functionality
- Role-based access control

### Authorization Middleware
```typescript
// Manager-only endpoints
requireManager(request)

// Employee or Manager endpoints
requireEmployeeOrManager(request)

// Admin verification
AdminService.isAdmin(userId)
```

### Permission Matrix

| Action | Manager | Employee | Admin |
|--------|---------|----------|-------|
| Create Transfer | ✅ | ❌ | ✅ |
| View Pending Transfers | ✅ | ❌ | ✅ |
| View Approved Transfers | ✅ | ✅ | ✅ |
| Edit Transfer | ✅ (pending only) | ❌ | ✅ |
| Accept Transfer | ❌ | ✅ | ❌ |
| Approve Transfer | ❌ | ❌ | ✅ |
| Reject Transfer | ❌ | ❌ | ✅ |
| Cancel Transfer | ✅ | ✅ (own) | ✅ |
| View All Transfers | ✅ | ❌ | ✅ |

### Data Validation
- Server-side validation for all inputs
- Client-side validation for better UX
- Hospital existence verification
- Date/time validation
- File upload restrictions
- SQL injection prevention
- XSS protection

---

## Configuration and Constants

### Transfer Configuration
```typescript
export const TRANSFER_CONFIG = {
  // ID Generation
  ID_PREFIXES: {
    TRANSFER: 'TRF',
    PATIENT: 'PAT',
    NOTIFICATION: 'NOT'
  },
  
  // Validation Rules
  VALIDATION: {
    MIN_REASON_LENGTH: 10,
    MAX_REASON_LENGTH: 1000,
    MIN_AGE: 0,
    MAX_AGE: 120,
    MAX_FUTURE_DAYS: 30,
    MIN_SCHEDULE_ADVANCE_HOURS: 1
  },
  
  // Status Transitions
  STATUS_TRANSITIONS: {
    'pending': ['accepted', 'cancelled'],
    'accepted': ['in_progress', 'cancelled'],
    'in_progress': ['completed', 'cancelled'],
    'completed': [],
    'cancelled': []
  },
  
  // Priority Weights
  PRIORITY_WEIGHTS: {
    'low': 1,
    'medium': 2,
    'high': 3,
    'urgent': 4
  },
  
  // Timeouts
  TIMEOUTS: {
    ACCEPT_TIMEOUT_HOURS: 24,
    COMPLETION_TIMEOUT_HOURS: 48,
    NOTIFICATION_EXPIRY_DAYS: 7
  },
  
  // File Upload
  FILE_UPLOAD: {
    MAX_FILE_SIZE_MB: 10,
    ALLOWED_TYPES: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
    MAX_FILES_PER_TRANSFER: 5
  }
}
```

### Communication Configuration
```typescript
// Email Configuration
EMAIL_CONFIG = {
  provider: 'sendgrid' | 'gmail-api' | 'gmail-smtp',
  apiKey: string,
  fromEmail: string,
  fromName: string
}

// SMS Configuration
SMS_CONFIG = {
  provider: 'twilio' | 'aws-sns' | 'messagebird',
  accountSid: string,      // Twilio
  authToken: string,       // Twilio
  fromNumber: string
}
```

### Database Indexes
```typescript
// Optimized for common queries
TRANSFER_INDEXES = [
  { transferId: 1 },                    // Unique lookup
  { 'patientInfo.firstName': 1, 'patientInfo.lastName': 1 }, // Patient search
  { 'patientInfo.dossierNumber': 1 },   // Dossier lookup
  { status: 1 },                        // Status filtering
  { priority: 1 },                      // Priority sorting
  { requestedBy: 1 },                   // Manager queries
  { requestedDate: -1 },                // Recent transfers
  { scheduledDate: 1 },                 // Calendar queries
  { lastModifiedBy: 1 },                // Audit queries
  { 'statusHistory.changedAt': -1 }     // Timeline queries
]
```

---

## System Architecture

### Technology Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with HTTP-only cookies
- **Real-time**: WebSocket (Socket.io)
- **Email**: SendGrid, Gmail API
- **SMS**: Twilio
- **File Storage**: GridFS (MongoDB)

### Key Services
1. **TransferService**: Core business logic
2. **CommunicationService**: Email/SMS orchestration
3. **TransferNotificationService**: Workflow notifications
4. **AdminService**: Admin user management
5. **AuthMiddleware**: Authentication and authorization
6. **ValidationService**: Data validation and sanitization

### Error Handling
- Comprehensive error logging
- User-friendly error messages
- Graceful degradation
- Retry mechanisms for external services
- Validation error mapping

### Performance Optimizations
- Database indexing for common queries
- Pagination for large datasets
- Caching for hospital data
- Lazy loading for components
- Optimized bundle sizes

---

## Future Enhancements

### Planned Features
1. **Mobile App**: React Native application
2. **Advanced Analytics**: Transfer performance metrics
3. **Integration APIs**: Hospital system integration
4. **Multi-language Support**: French/English localization
5. **Advanced Scheduling**: Recurring transfers, conflict detection
6. **Document Management**: Enhanced file handling
7. **Audit Logging**: Comprehensive system audit trail
8. **Performance Monitoring**: Real-time system metrics

### Scalability Considerations
- Horizontal scaling with load balancers
- Database sharding strategies
- CDN for static assets
- Microservices architecture migration
- Container orchestration with Kubernetes

---

*This document provides a comprehensive overview of the Patient Management System's transfer functionality. For technical implementation details, refer to the source code and API documentation.*
