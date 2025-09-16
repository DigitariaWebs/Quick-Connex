# Signup API Endpoint

## Overview
The signup endpoint handles user registration for both employees and managers in the patient management system. It includes comprehensive validation, security measures, and file upload handling.

## Endpoint
```
POST /api/auth/signup
```

## Request Format
The endpoint accepts `multipart/form-data` with the following fields:

### Common Fields (Required for all users)
- `userType` (string): Either "employee" or "manager"
- `firstName` (string): User's first name (min 2 characters)
- `lastName` (string): User's last name (min 2 characters)
- `email` (string): Valid email address (must be unique)
- `phone` (string): Valid phone number (7-15 digits)
- `password` (string): Strong password with specific requirements

### Manager-Specific Fields
- `post` (string): Manager's position/title (min 2 characters)
- `ciusss` (string): Manager's CIUSSS organization (required)

### Employee-Specific Fields
- `opiqPermit` (file): OPIQ permit document (PDF, DOC, DOCX, JPG, PNG - max 10MB)
- `rcr` (file): RCR document (PDF, DOC, DOCX, JPG, PNG - max 10MB)

## Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## File Upload Requirements
- **Allowed file types**: PDF, DOC, DOCX, JPG, PNG
- **Maximum file size**: 10MB per file
- **Security**: Filenames are sanitized and prefixed with timestamps

## Response Format

### Success Response (201)
```json
{
  "message": "Account created successfully",
  "user": {
    "userType": "employee",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "post": "Senior Manager", // Only for managers
    "class": "A", // Only for managers
    "opiqPermit": "/uploads/opiq_1234567890_document.pdf", // Only for employees
    "rcr": "/uploads/rcr_1234567890_document.pdf", // Only for employees
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "processingTime": "150ms"
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "message": "Validation failed",
  "errors": [
    "Password must be at least 8 characters long",
    "Password must contain at least one uppercase letter"
  ]
}
```

#### Duplicate Email (409)
```json
{
  "message": "An account with this email address already exists"
}
```

#### File Validation Error (400)
```json
{
  "message": "OPIQ permit validation failed: File size must be less than 10MB"
}
```

#### Server Error (500)
```json
{
  "message": "Registration failed. Please try again.",
  "error": "Detailed error message (development only)"
}
```

## Security Features

### Input Sanitization
- All text inputs are trimmed and sanitized
- HTML tags are removed from inputs
- Filenames are sanitized to prevent path traversal

### Password Security
- Passwords are hashed using bcrypt with 12 salt rounds
- Strong password requirements enforced
- Passwords are never returned in responses

### File Security
- File type validation
- File size limits
- Sanitized filenames with timestamps
- Secure file storage in `/public/uploads/`

### Logging & Monitoring
- Comprehensive logging of all signup attempts
- Security event logging for failed attempts
- Performance monitoring with processing time tracking
- Email-based tracking for audit purposes

## Error Handling

The endpoint provides detailed error messages for different scenarios:

1. **Validation Errors**: Field-specific validation messages
2. **Duplicate Email**: Clear message about existing accounts
3. **File Upload Errors**: Specific file validation messages
4. **Database Errors**: Handled gracefully with appropriate HTTP status codes
5. **Server Errors**: Generic messages in production, detailed in development

## Testing

Run the comprehensive test suite:
```bash
node src/app/api/auth/signup/test-signup.js
```

The test suite covers:
- Valid employee and manager signups
- Invalid email formats
- Weak passwords
- Missing required fields
- Duplicate email attempts
- Invalid user types
- File upload validation
- Manager-specific field validation

## Performance Considerations

- Database connection pooling via Mongoose
- Efficient file handling with streaming
- Optimized validation with early returns
- Processing time tracking for monitoring

## Dependencies

- `bcryptjs`: Password hashing
- `mongoose`: Database operations
- `fs/promises`: File system operations
- `path`: File path handling

## Environment Variables

- `MONGODB_URI`: MongoDB connection string
- `NODE_ENV`: Environment (affects error message detail)

## Rate Limiting

Consider implementing rate limiting for production use to prevent abuse:
- Limit signup attempts per IP
- Implement CAPTCHA for repeated failures
- Monitor for suspicious patterns
