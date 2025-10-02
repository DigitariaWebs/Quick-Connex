# Transfer Example Scripts

This directory contains scripts to easily create example transfers for testing the new polymorphic transfer system.

## 🚀 Quick Start

### Prerequisites
- Node.js and npm installed
- MongoDB running
- At least one manager user created
- At least two hospitals in the database

### Quick Test (Recommended)
```bash
# Create a single transfer of specific type
node scripts/quick-transfer-test.js patient
node scripts/quick-transfer-test.js envelope
node scripts/quick-transfer-test.js file
node scripts/quick-transfer-test.js equipment

# Create one of each type
node scripts/quick-transfer-test.js all
```

### Comprehensive Examples
```bash
# Create detailed transfer examples
node scripts/create-transfer-example.js --type=patient
node scripts/create-transfer-example.js --type=envelope
node scripts/create-transfer-example.js --type=file
node scripts/create-transfer-example.js --type=equipment

# Create all types with detailed examples
node scripts/create-transfer-example.js --type=all
```

## 📋 Available Transfer Types

### 1. Patient Transfers (Legacy)
- **Type**: `patient`
- **Data**: Patient name, age, dossier number
- **Use Case**: Traditional patient transfers between hospitals

### 2. Envelope/Box Transfers
- **Type**: `envelope`
- **Data**: Sender, recipient, contents, weight, dimensions
- **Use Case**: Package delivery between hospitals

### 3. Patient File Transfers
- **Type**: `file`
- **Data**: Patient name, file type, count, urgency
- **Use Case**: Medical records and documentation transfer

### 4. Medical Equipment Transfers
- **Type**: `equipment`
- **Data**: Equipment name, model, condition, maintenance status
- **Use Case**: Medical device and equipment transfers

## 🛠️ Script Details

### Quick Transfer Test (`quick-transfer-test.js`)
- **Purpose**: Fast creation of test transfers
- **Features**: 
  - Simple, predefined data
  - Quick execution
  - Minimal setup required
- **Best for**: Quick testing and development

### Comprehensive Examples (`create-transfer-example.js`)
- **Purpose**: Detailed transfer examples with realistic data
- **Features**:
  - Random realistic data generation
  - Multiple sample datasets
  - Detailed logging
  - Full transfer lifecycle simulation
- **Best for**: Comprehensive testing and demonstrations

## 📊 Sample Data Generated

### Patient Transfers
```javascript
{
  firstName: "John",
  lastName: "Smith", 
  age: 45,
  dossierNumber: "DOS-2024-001"
}
```

### Envelope Transfers
```javascript
{
  senderName: "Dr. Sarah Johnson",
  recipientName: "Dr. Michael Chen",
  contents: "Medical supplies and test results",
  weight: 2.5,
  dimensions: { length: 25, width: 15, height: 8 }
}
```

### File Transfers
```javascript
{
  patientName: "Jane Doe",
  dossierNumber: "DOS-2024-002",
  fileType: "X-Ray",
  fileCount: 3,
  urgency: "high"
}
```

### Equipment Transfers
```javascript
{
  equipmentName: "Ventilator V60",
  model: "Philips Respironics V60",
  condition: "good",
  serialNumber: "SN-2024-001",
  maintenanceRequired: false
}
```

## 🎯 Use Cases

### Development Testing
```bash
# Test patient transfer functionality
node scripts/quick-transfer-test.js patient

# Test envelope transfer notifications
node scripts/quick-transfer-test.js envelope

# Test file transfer UI components
node scripts/quick-transfer-test.js file

# Test equipment transfer workflow
node scripts/quick-transfer-test.js equipment
```

### Demo Preparation
```bash
# Create comprehensive examples for demos
node scripts/create-transfer-example.js --type=all
```

### Notification Testing
```bash
# Create urgent transfers to test notification system
node scripts/create-transfer-example.js --type=patient
# Then manually update priority to 'urgent' in database
```

## 🔧 Customization

### Modifying Sample Data
Edit the `SAMPLE_DATA` object in `create-transfer-example.js`:

```javascript
const SAMPLE_DATA = {
  patient: {
    firstName: ['Your', 'Custom', 'Names'],
    // ... add more data
  },
  // ... other categories
};
```

### Adding New Transfer Types
1. Add new category to `TransferCategory` enum
2. Add sample data to `SAMPLE_DATA` object
3. Create generator function (e.g., `generateNewTypeTransfer()`)
4. Add case to switch statement in `createTransferExample()`

## 🐛 Troubleshooting

### Common Issues

**"No manager found"**
```bash
# Create a manager user first
node scripts/setup-admin.js
```

**"Need at least 2 hospitals"**
```bash
# Create hospitals first
node scripts/seed-hospitals.js
```

**"Database connection failed"**
```bash
# Check MongoDB is running
# Verify MONGODB_URI environment variable
```

### Debug Mode
Add `console.log` statements in the scripts to debug:
```javascript
console.log('Debug: Transfer data:', transferData);
```

## 📈 Performance

### Quick Script
- **Execution time**: ~2-3 seconds per transfer
- **Database operations**: Minimal
- **Memory usage**: Low

### Comprehensive Script
- **Execution time**: ~5-10 seconds per transfer
- **Database operations**: Full transfer creation
- **Memory usage**: Moderate

## 🔄 Integration with Existing Scripts

These scripts work alongside existing scripts:
- `setup-admin.js` - Creates admin users
- `seed-hospitals.js` - Creates hospital data
- `create-test-users.js` - Creates test users
- `test-notifications.js` - Tests notification system

## 📝 Output Examples

### Successful Creation
```
🚀 Creating patient transfer example...
✅ Connected to database
✅ Transfer created successfully!
📋 Transfer ID: PAT-123456
📂 Category: patient
🏥 From: Montreal General Hospital
🏥 To: Royal Victoria Hospital
👤 Requested by: Dr. John Smith
📅 Scheduled: 12/15/2024
⚡ Priority: medium
👤 Patient: John Smith (45y)
📄 Dossier: DOS-2024-001
🎉 Transfer example created successfully!
```

### Error Handling
```
❌ No approved manager found. Please create a manager user first.
❌ Need at least 2 hospitals in database. Please create hospitals first.
❌ Invalid transfer type. Use: patient, envelope, file, equipment, or all
```

## 🚀 Next Steps

After creating transfer examples:

1. **Test the UI**: Open the transfers page and verify all transfer types display correctly
2. **Test Notifications**: Check that email and SMS notifications work for each type
3. **Test Workflow**: Try approving, accepting, and completing transfers
4. **Test Filtering**: Verify you can filter transfers by category
5. **Test Reports**: Generate reports that distinguish between transfer types

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Check the console output for specific error messages
4. Ensure database connectivity and user permissions
