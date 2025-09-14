# Employee Dashboard - Patient Management System

## Overview

The Employee Dashboard is designed for healthcare employees to manage patient transfer requests. Employees can view incoming transfer requests from managers and accept them to facilitate patient movement between hospitals.

## Features

### 🏥 Dashboard Overview
- **Real-time Statistics**: View counts of pending, accepted, in-progress, and completed transfers
- **Filter System**: Filter transfers by status (All, Pending, Accepted, In Progress)
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### 📋 Transfer Request Management
- **View Transfer Details**: See comprehensive patient information, transfer reasons, and priority levels
- **Accept Transfers**: One-click acceptance of transfer requests
- **Priority Indicators**: Visual priority levels (Low, Medium, High, Urgent)
- **Status Tracking**: Real-time status updates for all transfers

### 👤 Patient Information
- **Complete Patient Profile**: Name, age, gender, contact information
- **Medical History**: Blood type, allergies, medications, medical history
- **Current Location**: Current hospital and department information
- **Emergency Contacts**: Emergency contact details

## Getting Started

### 1. Seed Sample Data
First, populate the database with sample data:

```bash
# Visit the seed data endpoint
http://localhost:3000/api/seed-data
```

This will create:
- 2 sample users (1 manager, 1 employee)
- 3 sample patients with complete medical information
- 3 sample transfer requests with different statuses

### 2. Access the Dashboard
Navigate to the employee dashboard:

```
http://localhost:3000/dashboard
```

### 3. Explore Transfer Requests
- View all transfer requests in the main grid
- Use filter tabs to view specific status types
- Click "Details" to see additional information
- Click "Accept Transfer" to accept pending requests

## API Endpoints

### GET /api/transfers
Retrieve transfer requests with optional filtering:

```javascript
// Get all transfers
GET /api/transfers

// Get pending transfers only
GET /api/transfers?status=pending

// Get transfers assigned to specific employee
GET /api/transfers?assignedTo=employee-id
```

### PUT /api/transfers/[id]/accept
Accept a transfer request:

```javascript
PUT /api/transfers/transfer-id/accept
{
  "assignedTo": "employee-user-id",
  "notes": "Transfer accepted by employee"
}
```

### POST /api/seed-data
Create sample data for testing (POST request to seed endpoint).

## Data Models

### Patient Model
```typescript
interface IPatient {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email?: string;
  address: Address;
  medicalInfo: MedicalInfo;
  currentHospital?: string;
  currentDepartment?: string;
  status: 'active' | 'discharged' | 'transferred';
}
```

### Transfer Model
```typescript
interface ITransfer {
  transferId: string;
  patientId: string;
  patient: ObjectId;
  fromHospital: string;
  fromDepartment: string;
  toHospital: string;
  toDepartment: string;
  requestedBy: ObjectId;
  assignedTo?: ObjectId;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  requestedDate: Date;
  scheduledDate?: Date;
  notes?: string;
}
```

## User Interface Components

### DashboardHeader
- Navigation and branding
- Filter tabs for transfer status
- User information display

### DashboardStats
- Statistics cards showing transfer counts
- Color-coded priority indicators
- Animated counters

### TransferRequestCard
- Complete transfer request display
- Patient information summary
- Action buttons (Accept, Details)
- Priority and status indicators

### LoadingSpinner
- Animated loading indicator
- Used during data fetching

## Styling and Animation

The dashboard uses:
- **Framer Motion**: For smooth animations and transitions
- **Tailwind CSS**: For responsive styling
- **Gradient Backgrounds**: Modern visual design
- **Glass Morphism**: Subtle transparency effects
- **Hover Effects**: Interactive feedback

## Future Enhancements

### Planned Features
- **Authentication System**: User login and session management
- **Real-time Updates**: WebSocket integration for live updates
- **Notification System**: Push notifications for new requests
- **File Upload**: Medical document attachments
- **Search and Filtering**: Advanced search capabilities
- **Mobile App**: React Native mobile application
- **Manager Dashboard**: Separate interface for managers to create requests

### Technical Improvements
- **Database Optimization**: Indexing and query optimization
- **Caching**: Redis integration for better performance
- **Error Handling**: Comprehensive error management
- **Testing**: Unit and integration tests
- **Documentation**: API documentation with Swagger

## Troubleshooting

### Common Issues

1. **No Transfer Requests Showing**
   - Ensure sample data has been seeded
   - Check database connection
   - Verify API endpoints are working

2. **Accept Transfer Not Working**
   - Check network connectivity
   - Verify user authentication
   - Check browser console for errors

3. **Styling Issues**
   - Ensure Tailwind CSS is properly configured
   - Check for CSS conflicts
   - Verify responsive breakpoints

### Development Tips

- Use browser developer tools to inspect API calls
- Check the Network tab for failed requests
- Use the Console tab for JavaScript errors
- Test on different screen sizes for responsiveness

## Support

For technical support or feature requests, please refer to the main project documentation or contact the development team.
