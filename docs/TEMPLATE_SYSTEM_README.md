# Template System Documentation

## Overview

The template system has been refactored to separate HTML templates from business logic, making the codebase cleaner and more maintainable.

## Architecture

### 1. Template Files
- **Location**: `src/templates/email/transfer/`
- **Format**: HTML files with Handlebars templating
- **Templates**:
  - `request.html` - Transfer request notifications
  - `approved.html` - Transfer approval notifications  
  - `accepted.html` - Transfer acceptance notifications

### 2. Template Loader
- **File**: `src/lib/template-loader.ts`
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
- `{{eq a b}}` - Equality comparison
- `{{lowercase str}}` - Convert to lowercase
- `{{uppercase str}}` - Convert to uppercase

## Usage Example

```typescript
import TemplateLoader from '@/lib/template-loader';

const templateLoader = TemplateLoader.getInstance();

const templateData = {
  transferId: 'TR-2024-001',
  priority: 'URGENT',
  patientName: 'John Doe',
  isUrgent: true
};

const html = templateLoader.renderTemplate('email/transfer/request.html', templateData);
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
src/
├── templates/
│   └── email/
│       └── transfer/
│           ├── request.html
│           ├── approved.html
│           └── accepted.html
├── lib/
│   ├── template-loader.ts
│   └── communication/
│       └── transfer-notification-service.ts
└── docs/
    └── TEMPLATE_SYSTEM_README.md
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
private generateTransferRequestEmailHTML(transferData: any): string {
  const templateData = {
    ...transferData,
    isUrgent: transferData.priority === 'URGENT'
  };
  
  return this.templateLoader.renderTemplate('email/transfer/request.html', templateData);
}
```

## Future Enhancements

1. **Template Validation** - Validate template syntax
2. **Template Preview** - Preview templates with sample data
3. **Template Editor** - Web-based template editor
4. **Multi-language Support** - Internationalization
5. **Template Versioning** - Version control for templates

## Troubleshooting

### Common Issues

1. **Template Not Found**
   - Check file path in `src/templates/`
   - Ensure file exists and has `.html` extension

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
