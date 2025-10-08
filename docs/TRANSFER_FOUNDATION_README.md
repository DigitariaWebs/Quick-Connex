# Transfer System Foundation Layer

This document provides a comprehensive overview of the transfer system foundation layer that has been implemented for the patient management application. The foundation layer provides a robust, scalable, and maintainable architecture for managing patient transfers.

## 🏗️ Architecture Overview

The transfer system foundation is built with a layered architecture that separates concerns and provides clear interfaces between components. The system focuses on **data management** rather than logistics - hospitals handle their own scheduling, resource allocation, and conflict resolution.

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  (React Components, Forms, UI Components)                  │
├─────────────────────────────────────────────────────────────┤
│                    API Layer                                │
│  (Next.js API Routes, Request/Response Handlers)           │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                            │
│  (TransferService, Business Logic)                         │
├─────────────────────────────────────────────────────────────┤
│                    Foundation Layer                         │
│  (Constants, Types, Utils, Errors, Events)                 │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                               │
│  (MongoDB, Mongoose Models)                                │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Foundation Components

### 1. Constants and Configuration (`/src/constants/transfer-constants.ts`)

**Purpose**: Centralized configuration and constants for the entire transfer system.

**Key Features**:
- **Enums**: TransferStatus, TransferPriority, TransferType, etc.
- **Configuration**: Validation rules, timeouts, pagination settings, file upload limits
- **Display Information**: Status and priority display configurations with colors and icons
- **Error Messages**: Standardized error messages for consistent user experience
- **API Endpoints**: Centralized endpoint definitions

**Usage Example**:
```typescript
import { TransferStatus, TransferPriority, TRANSFER_CONFIG } from '@/constants/transfer-constants';

// Use enums for type safety
const status = TransferStatus.PENDING;
const priority = TransferPriority.URGENT;

// Access configuration
const maxFileSize = TRANSFER_CONFIG.FILE_UPLOAD.MAX_FILE_SIZE_MB;
```

### 2. Types and Interfaces (`/src/types/transfer-types.ts`)

**Purpose**: Comprehensive TypeScript type definitions for type safety and consistency.

**Key Features**:
- **Core Interfaces**: ITransfer, TransferResponse, TransferRequestData
- **Utility Types**: PatientInfo, UserInfo, SchedulingConfig, ConflictInfo
- **API Types**: TransferListResponse, TransferActionResponse, ApiResponse
- **Filter and Query Types**: TransferFilterOptions, TransferQueryOptions
- **Analytics Types**: TransferStats, TransferAnalytics

**Usage Example**:
```typescript
import { TransferResponse, TransferRequestData } from '@/types/transfer-types';

// Type-safe transfer operations
const transfer: TransferResponse = await getTransferById(id);
const newTransfer: TransferRequestData = {
  patientFirstName: 'John',
  patientLastName: 'Doe',
  // ... other required fields
};
```

### 3. Service Layer (`/src/lib/transfer-service.ts`)

**Purpose**: Core business logic for transfer operations.

**Key Features**:
- **CRUD Operations**: Create, read, update, delete transfers
- **Status Management**: Accept, start, complete, cancel transfers
- **Validation**: Comprehensive data validation with detailed error reporting
- **Statistics**: Calculate transfer statistics and analytics
- **Permissions**: Role-based access control for transfer actions

**Usage Example**:
```typescript
import { TransferService } from '@/lib/transfer-service';

// Create a new transfer
const result = await TransferService.createTransfer(transferData, requestingUser);

// Get transfers with filtering
const transfers = await TransferService.getTransfers({
  filter: { status: [TransferStatus.PENDING] },
  sort: { field: 'priority', direction: 'desc' },
  page: 1,
  pageSize: 20
});

// Accept a transfer
const acceptResult = await TransferService.acceptTransfer(transferId, userId);
```

### 4. Utilities and Helpers (`/src/lib/transfer-utils.ts`)

**Purpose**: Reusable utility functions and helper classes.

**Key Features**:
- **DateUtils**: Date formatting, age calculation, duration calculations
- **TransferDisplayUtils**: Status/priority display formatting, badge classes
- **TransferCalculationUtils**: Statistics calculations, priority scoring
- **TransferFilterUtils**: Filtering, sorting, and pagination utilities
- **TransferCalendarUtils**: Calendar event conversion and recurring instance generation
- **TransferValidationUtils**: Input validation and sanitization

**Usage Example**:
```typescript
import { DateUtils, TransferDisplayUtils, TransferCalculationUtils } from '@/lib/transfer-utils';

// Format dates
const formattedDate = DateUtils.formatDateTime(transfer.requestedDate);
const age = DateUtils.calculateAge(patient.dateOfBirth);

// Get display information
const statusInfo = TransferDisplayUtils.getStatusDisplayInfo(transfer.status);
const badgeClasses = TransferDisplayUtils.getStatusBadgeClasses(transfer.status);

// Calculate statistics
const stats = TransferCalculationUtils.calculateStats(transfers);
const urgencyScore = TransferCalculationUtils.calculateUrgencyScore(
  transfer.priority, 
  transfer.requestedDate, 
  transfer.status
);
```

### 5. Error Handling System (`/src/lib/transfer-errors.ts`)

**Purpose**: Comprehensive error handling with custom error classes and standardized responses.

**Key Features**:
- **Custom Error Classes**: TransferError with error codes and status codes
- **Error Factory**: Factory methods for creating specific error types
- **Error Response Utilities**: Standardized error response formatting
- **Error Handler Middleware**: Async error handling with automatic error processing
- **Error Recovery**: Retry mechanisms, circuit breakers, fallback operations
- **Error Monitoring**: Error tracking and analytics

**Usage Example**:
```typescript
import { TransferErrorFactory, TransferErrorHandler } from '@/lib/transfer-errors';

// Create specific errors
const validationError = TransferErrorFactory.validationError('Invalid data');
const notFoundError = TransferErrorFactory.notFoundError('Transfer', transferId);

// Handle async operations with error catching
const result = await TransferErrorHandler.handleAsync(async () => {
  return await TransferService.createTransfer(data, user);
});

// Retry with exponential backoff
const result = await TransferErrorRecovery.retryWithBackoff(
  () => externalServiceCall(),
  3, // max retries
  1000 // base delay
);
```

### 6. Event System (`/src/lib/transfer-events.ts`)

**Purpose**: Event-driven architecture for notifications and system integration.

**Key Features**:
- **Event Types**: Comprehensive event type definitions
- **Event Manager**: Centralized event emission and handling
- **Event Handlers**: Notification, audit, reminder, and conflict handlers
- **Event Factory**: Factory methods for creating standardized events
- **Real-time Notifications**: Socket.io integration for live updates
- **Persistent Notifications**: Database storage for notification history

**Usage Example**:
```typescript
import { TransferEventManager, TransferEventFactory } from '@/lib/transfer-events';

// Emit events
await TransferEventManager.emitEvent(
  TransferEventType.TRANSFER_CREATED,
  TransferEventFactory.createTransferCreatedEvent(transfer, user)
);

// Register custom handlers
TransferEventManager.registerHandler(new CustomEventHandler());
```

## 🚀 Getting Started

### 1. Import the Foundation Layer

```typescript
// Import everything from the foundation layer
import * from '@/lib/transfer-foundation';

// Or import specific components
import { 
  TransferService, 
  TransferStatus, 
  TransferPriority,
  DateUtils,
  TransferErrorFactory 
} from '@/lib/transfer-foundation';
```

### 2. Initialize the System

```typescript
import { initializeTransferEvents } from '@/lib/transfer-foundation';

// Initialize the event system
initializeTransferEvents();
```

### 3. Use in API Routes

```typescript
// pages/api/transfers/route.ts
import { TransferService, TransferErrorResponse } from '@/lib/transfer-foundation';

export async function POST(request: NextRequest) {
  try {
    const result = await TransferService.createTransfer(transferData, user);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return TransferErrorResponse.createErrorResponse(result.error);
    }
  } catch (error) {
    return TransferErrorResponse.createErrorResponse(error);
  }
}
```

### 4. Use in React Components

```typescript
// components/TransferCard.tsx
import { 
  TransferDisplayUtils, 
  DateUtils, 
  TransferStatus 
} from '@/lib/transfer-foundation';

export function TransferCard({ transfer }: { transfer: TransferResponse }) {
  const statusInfo = TransferDisplayUtils.getStatusDisplayInfo(transfer.status);
  const formattedDate = DateUtils.formatDateTime(transfer.requestedDate);
  
  return (
    <div className={`${TransferDisplayUtils.getStatusBadgeClasses(transfer.status)}`}>
      <h3>{transfer.patient.firstName} {transfer.patient.lastName}</h3>
      <p>Status: {statusInfo.label}</p>
      <p>Date: {formattedDate}</p>
    </div>
  );
}
```

## 🔧 Configuration

### Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/patients_management
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### Custom Configuration

You can customize the transfer system by modifying the constants in `/src/constants/transfer-constants.ts`:

```typescript
export const TRANSFER_CONFIG = {
  VALIDATION: {
    MIN_REASON_LENGTH: 10, // Minimum reason length
    MAX_FUTURE_DAYS: 30,   // Maximum days in future for scheduling
  },
  TIMEOUTS: {
    ACCEPT_TIMEOUT_HOURS: 24, // Hours before transfer acceptance times out
  },
  // ... other configurations
};
```

## 📊 Features

### ✅ Implemented Features

- **Complete CRUD Operations**: Create, read, update, delete transfers
- **Status Management**: Full lifecycle management with validation
- **Role-based Permissions**: Manager and employee role differentiation
- **Scheduling**: Time slots and resource management
- **Real-time Notifications**: Socket.io integration for live updates
- **Comprehensive Validation**: Data validation with detailed error reporting
- **Statistics and Analytics**: Transfer statistics and performance metrics
- **Error Handling**: Robust error handling with recovery mechanisms
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Event System**: Event-driven architecture for extensibility
- **Utility Functions**: Comprehensive utility library for common operations

### 🔄 Status Flow

```
PENDING → ACCEPTED → IN_PROGRESS → COMPLETED
    ↓         ↓           ↓
CANCELLED ← CANCELLED ← CANCELLED
```

### 🎯 Priority Levels

- **URGENT**: Critical transfers requiring immediate attention
- **HIGH**: High priority transfers
- **MEDIUM**: Standard priority transfers (default)
- **LOW**: Non-urgent transfers

### 📋 Transfer Types

- **STAT**: Immediate/urgent transfers
- **SCHEDULED**: Planned transfers

## 🧪 Testing

The foundation layer is designed to be easily testable:

```typescript
// Example test
import { TransferService, TransferErrorFactory } from '@/lib/transfer-foundation';

describe('TransferService', () => {
  it('should create a transfer successfully', async () => {
    const transferData = {
      patientFirstName: 'John',
      patientLastName: 'Doe',
      // ... other required fields
    };
    
    const result = await TransferService.createTransfer(transferData, mockUser);
    
    expect(result.success).toBe(true);
    expect(result.transfer).toBeDefined();
  });
});
```

## 🔮 Future Enhancements

- **Machine Learning**: Predictive analytics for transfer optimization
- **Mobile App**: React Native mobile application
- **Advanced Reporting**: Comprehensive reporting and dashboard
- **Integration APIs**: Third-party system integrations
- **Workflow Automation**: Automated transfer workflows
- **Performance Monitoring**: Real-time performance metrics

## 📝 Contributing

When contributing to the transfer system foundation:

1. **Follow TypeScript**: Maintain strict type safety
2. **Add Tests**: Include comprehensive tests for new features
3. **Update Documentation**: Keep this README and code comments up to date
4. **Follow Patterns**: Use established patterns and conventions
5. **Error Handling**: Always include proper error handling
6. **Performance**: Consider performance implications of changes

## 📞 Support

For questions or issues with the transfer system foundation:

1. Check the code comments and type definitions
2. Review the existing API routes for usage examples
3. Consult the error handling system for debugging
4. Use the utility functions for common operations

---

**The transfer system foundation provides a solid, scalable base for building comprehensive patient transfer management capabilities. It follows industry best practices for maintainability, type safety, and extensibility.**
