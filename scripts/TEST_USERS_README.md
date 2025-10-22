# Test Users Creation Script

This script creates test users for testing the new dashboard-only approval system.

## 🎯 What It Creates

### **3 Employees**
- **Marie Dubois** - `marie.dubois@test.com`
- **Jean Tremblay** - `jean.tremblay@test.com`  
- **Sophie Gagnon** - `sophie.gagnon@test.com`

**Employee Features:**
- ✅ All required documents (CV, OPIQ Permit, RCR)
- ✅ Uses `Montreal.docx` as template for all documents
- ✅ Status: `pending` (requires approval)
- ✅ Password: `TestPassword123!`

### **3 Managers**
- **Pierre Lavoie** - `pierre.lavoie@test.com` (Coordinateur)
- **Isabelle Bergeron** - `isabelle.bergeron@test.com` (Assistant-chef)
- **François Côté** - `francois.cote@test.com` (Gestionnaire)

**Manager Features:**
- ✅ CIUSSS assignment (random from database)
- ✅ Hospital assignment (random from database)
- ✅ Position/Post assigned
- ✅ Status: `pending` (requires approval)
- ✅ Password: `TestPassword123!`

## 🚀 How to Run

### **Option 1: Using the Shell Script (Recommended)**
```bash
# From project root
./scripts/create-test-users.sh
```

### **Option 2: Direct Node.js Execution**
```bash
# From project root
node scripts/essentials/create-test-users.js
```

## 📋 Prerequisites

1. **Database Connection**: Ensure MongoDB is running and accessible
2. **Environment Variables**: `.env.local` file with `MONGODB_URI`
3. **Existing Data**: CIUSSS and Hospital data should be seeded first
4. **Montreal.docx**: Located in `test/` directory (optional)

## 🔧 What the Script Does

1. **Connects to MongoDB** using environment variables
2. **Clears existing test users** (by email pattern)
3. **Gets random CIUSSS and Hospital** from database
4. **Creates 3 employees** with document references
5. **Creates 3 managers** with CIUSSS/Hospital assignments
6. **Hashes passwords** using bcrypt (12 salt rounds)
7. **Sets all users to PENDING status**

## 📄 Document Handling

### **For Employees:**
- Uses `test/Montréal.docx` as template
- Creates 3 document references per employee:
  - `Montreal_cv.docx` (CV document)
  - `Montreal_opiqPermit.docx` (OPIQ permit)
  - `Montreal_rcr.docx` (RCR document)
- If `Montreal.docx` is missing, creates mock document metadata

### **For Managers:**
- No documents required
- Assigned to random CIUSSS and Hospital from database

## 🎛️ Testing the Approval System

After running the script:

1. **Check Email**: Admin should receive 6 email notifications
2. **Go to Dashboard**: Navigate to `/admin/users`
3. **Filter by Status**: Click "Pending" to see new users
4. **Review Users**: Click on any user to open UserDetailsModal
5. **Test Approval**: Use "Approve User" or "Reject User" buttons
6. **Verify Notifications**: Check that users receive approval/rejection emails

## 🔍 Expected Results

### **Admin Dashboard:**
- 6 new users with "Pending" status
- Users visible in admin dashboard
- Approve/Reject buttons available in UserDetailsModal

### **Email Notifications:**
- 6 admin notification emails (one per user)
- Each email contains dashboard link (not approval links)
- User notification emails after approval/rejection

### **User Status Changes:**
- Approved users: Status → `approved`, can login
- Rejected users: Status → `rejected`, cannot login

## 🧹 Cleanup

To remove test users:
```bash
# Delete all test users
node -e "
const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config({ path: '.env.local' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const testEmails = [
    'marie.dubois@test.com',
    'jean.tremblay@test.com', 
    'sophie.gagnon@test.com',
    'pierre.lavoie@test.com',
    'isabelle.bergeron@test.com',
    'francois.cote@test.com'
  ];
  
  const result = await User.deleteMany({ email: { \$in: testEmails } });
  console.log(\`Deleted \${result.deletedCount} test users\`);
  process.exit(0);
});
"
```

## 🐛 Troubleshooting

### **"MongoDB connection failed"**
- Check `.env.local` file has correct `MONGODB_URI`
- Ensure MongoDB is running
- Verify network connectivity

### **"CIUSSS/Hospital not found"**
- Run CIUSSS seeding: `node scripts/essentials/seed-ciusss.js`
- Run Hospital seeding: `node scripts/essentials/seed-hospitals.js`

### **"Montreal.docx not found"**
- Script will create mock documents instead
- Not critical for testing approval system

### **"Email notifications not sent"**
- Check email service configuration
- Verify `ADMIN_EMAIL` environment variable
- Check email service logs

## 📊 Success Indicators

✅ **Script Output:**
```
✅ Created employee: Marie Dubois (marie.dubois@test.com)
✅ Created employee: Jean Tremblay (jean.tremblay@test.com)
✅ Created employee: Sophie Gagnon (sophie.gagnon@test.com)
✅ Created manager: Pierre Lavoie (pierre.lavoie@test.com)
✅ Created manager: Isabelle Bergeron (isabelle.bergeron@test.com)
✅ Created manager: François Côté (francois.cote@test.com)
🎉 Test users created successfully!
```

✅ **Admin Dashboard:**
- 6 users visible with "Pending" status
- Approve/Reject buttons functional
- User details display correctly

✅ **Email System:**
- Admin receives notification emails
- Users receive approval/rejection emails
- No approval/rejection links in admin emails

## 🎉 Ready for Testing!

The script creates a complete test environment for the new dashboard-only approval system. All users are in "pending" status and ready for approval testing through the admin dashboard.
