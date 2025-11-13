# Template System Documentation

## Overview

The template system has been refactored to separate HTML templates from business logic, making the codebase cleaner and more maintainable.

## Architecture

### 1. Template Files
- **Location**: `src/lib/communication/templates/files/email/`
- **Format**: HTML files with Handlebars templating
- **Template Categories**:
  - **Transfer Templates** (`transfer/`):
    - `request.html` - Transfer request notifications
    - `approved.html` - Transfer approval notifications  
    - `accepted.html` - Transfer acceptance notifications
    - `rejected.html` - Transfer rejection notifications
  - **Auth Templates** (`auth/`):
    - `password-reset.html` - Password reset emails
    - `email-verification.html` - Email verification code emails
  - **User Templates** (`user/`):
    - `approval-request.html` - User approval request emails (to admin)
    - `account-approved.html` - Account approved notification emails
    - `account-rejected.html` - Account rejected notification emails

### 2. Template Loader
- **File**: `src/lib/communication/templates/core/TemplateLoader.ts`
- **Purpose**: Loads and renders HTML templates with data
- **Features**:
  - Template caching for performance
  - Handlebars helpers registration
  - File system template loading
  - Error handling

### 3. Integration
- **Service**: `TransferNotificationService`
- **Usage**: Uses `TemplateLoader` to render templates instead of inline HTML

## Template Structure

### Handlebars Variables
Templates use Handlebars syntax for dynamic content:

```html
<!-- Simple variable -->
<h1>{{title}}</h1>

<!-- Conditional rendering -->
{{#if isUrgent}}
  <div class="urgent-alert">URGENT!</div>
{{/if}}

<!-- Helper functions -->
<span class="priority-{{lowercase priority}}">{{priority}}</span>
```

### Available Helpers
- `{{#if condition}}` - Conditional rendering
- `{{#unless condition}}` - Inverse conditional
- `{{#each array}}` - Array iteration (built-in Handlebars helper)
- `{{eq a b}}` - Equality comparison
- `{{lowercase str}}` - Convert to lowercase
- `{{uppercase str}}` - Convert to uppercase

## Usage Examples

### Transfer Email Template
```typescript
import { TemplateLoader } from '@/lib/communication/templates/core/TemplateLoader';

const templateLoader = TemplateLoader.getInstance();

const templateData = {
  transferId: 'TR-2024-001',
  priority: 'URGENT',
  patientName: 'John Doe',
  isUrgent: true
};

const html = templateLoader.renderTemplate('email/transfer/request.html', templateData);
```

### Auth Email Template
```typescript
const templateLoader = TemplateLoader.getInstance();

const templateData = {
  firstName: 'John',
  lastName: 'Doe',
  resetUrl: 'https://example.com/reset-password?token=...',
  expirationMinutes: 1
};

const html = templateLoader.renderTemplate('email/auth/password-reset.html', templateData);
```

### User Email Template
```typescript
const templateLoader = TemplateLoader.getInstance();

const templateData = {
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  userType: 'manager',
  baseUrl: 'https://example.com'
};

const html = templateLoader.renderTemplate('email/user/account-approved.html', templateData);
```

## Benefits

### 1. **Separation of Concerns**
- HTML templates are separate from business logic
- Easier to maintain and update templates
- Designers can work on templates without touching code

### 2. **Reusability**
- Templates can be reused across different services
- Consistent styling and structure
- Easy to create template variations

### 3. **Maintainability**
- Template changes don't require code changes
- Version control is cleaner
- Easier to debug template issues

### 4. **Performance**
- Template caching reduces file I/O
- Compiled templates are reused
- Faster rendering after initial load

## File Structure

```
src/lib/communication/templates/
├── files/
│   └── email/
│       ├── auth/
│       │   ├── password-reset.html
│       │   └── email-verification.html
│       ├── user/
│       │   ├── approval-request.html
│       │   ├── account-approved.html
│       │   └── account-rejected.html
│       └── transfer/
│           ├── request.html
│           ├── approved.html
│           ├── accepted.html
│           └── rejected.html
├── core/
│   ├── TemplateLoader.ts
│   ├── TemplateValidator.ts
│   └── TemplatePreviewService.ts
├── email-templates.ts
├── sms-templates.ts
└── index.ts
```

## Migration Notes

### Before (Inline HTML)
```typescript
private generateTransferRequestEmailHTML(transferData: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>...</head>
      <body>
        <h1>${transferData.title}</h1>
        ${transferData.priority === 'URGENT' ? '<div class="urgent">URGENT!</div>' : ''}
      </body>
    </html>
  `;
}
```

### After (Template System)
```typescript
import { TemplateLoader } from '@/lib/communication/templates/core/TemplateLoader';

const templateLoader = TemplateLoader.getInstance();

private generateTransferRequestEmailHTML(transferData: any): string {
  const templateData = {
    ...transferData,
    isUrgent: transferData.priority === 'URGENT'
  };
  
  return templateLoader.renderTemplate('email/transfer/request.html', templateData);
}
```

## Available Templates

### Transfer Templates
- `email/transfer/request.html` - New transfer request notifications
- `email/transfer/approved.html` - Transfer approval notifications
- `email/transfer/accepted.html` - Transfer acceptance notifications
- `email/transfer/rejected.html` - Transfer rejection notifications

### Auth Templates
- `email/auth/password-reset.html` - Password reset emails
- `email/auth/email-verification.html` - Email verification code emails

### User Templates
- `email/user/approval-request.html` - User approval request emails (sent to admin)
- `email/user/account-approved.html` - Account approved notification emails
- `email/user/account-rejected.html` - Account rejected notification emails

## Future Enhancements

1. **Template Validation** - Validate template syntax
2. **Template Preview** - Preview templates with sample data
3. **Template Editor** - Web-based template editor
4. **Multi-language Support** - Internationalization
5. **Template Versioning** - Version control for templates

## Troubleshooting

### Common Issues

1. **Template Not Found**
   - Check file path in `src/lib/communication/templates/files/`
   - Ensure file exists and has `.html` extension
   - Verify the path is relative to the `files/` directory (e.g., `email/auth/password-reset.html`)

2. **Variable Not Rendering**
   - Check variable name spelling
   - Ensure data is passed to template

3. **Handlebars Syntax Error**
   - Validate Handlebars syntax
   - Check for unclosed tags

### Debug Mode
Enable template debugging by adding console logs in `TemplateLoader`:

```typescript
console.log('Rendering template:', templatePath);
console.log('Template data:', data);
```
