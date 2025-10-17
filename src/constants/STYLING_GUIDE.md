# Styling Guide - Centralized Design System

This guide explains how to use the centralized design system for consistent styling across the entire application.

## 📦 Available Modules

### 1. Theme Configuration (`theme.ts`)
General design tokens for the entire application.

### 2. Transfer Styles Configuration (`transferStyles.ts`)
Transfer-specific styling for categories, statuses, and priorities.

## 🎨 Usage Examples

### Theme Configuration

```typescript
import {
  BORDER_RADIUS,
  CARD_STYLES,
  INPUT_STYLES,
  SHADOWS,
  TRANSITIONS,
} from "@/constants";

// Using border radius
<div className={`bg-white ${BORDER_RADIUS["3xl"]}`}>

// Using pre-composed card styles
<div className={CARD_STYLES.rounded}>

// Using input styles
<input className={INPUT_STYLES.pill} />
```

### Transfer Styles

```typescript
import {
  getTransferCategoryConfig,
  getTransferStatusConfig,
  getTransferPriorityConfig,
  STAT_CARD_COLORS,
} from "@/constants";

// Get transfer category configuration
const categoryConfig = getTransferCategoryConfig("patient");
const CategoryIcon = categoryConfig.icon;

<div className={`${categoryConfig.bgColor} ${categoryConfig.color}`}>
  <CategoryIcon className="w-5 h-5" />
  <span>{categoryConfig.label}</span>
</div>

// Get transfer status configuration
const statusConfig = getTransferStatusConfig("pending");
const StatusIcon = statusConfig.icon;

<span className={statusConfig.badgeClass}>
  {statusConfig.label}
</span>

// Get transfer priority configuration
const priorityConfig = getTransferPriorityConfig("urgent");

<div className={`w-2 h-2 rounded-full ${priorityConfig.dotColor}`} />

// Using stat card colors
<div className={`${STAT_CARD_COLORS.total.bg} ${STAT_CARD_COLORS.total.border}`}>
  <div className={STAT_CARD_COLORS.total.iconBg}>
    <Icon className={STAT_CARD_COLORS.total.iconColor} />
  </div>
</div>
```

## 📊 Available Configurations

### Transfer Categories
- `patient` - Blue theme (`User` icon, `text-blue-600`)
- `envelope` - Orange theme (`Package` icon, `text-orange-600`)
- `medical_instruments` - Purple theme (`Stethoscope` icon, `text-purple-600`)

Each includes: `icon`, `label`, `color`, `bgColor`

### Transfer Statuses
- `pending` - Amber theme (`Clock` icon, `bg-amber-100 text-amber-800`)
- `accepted` - Green theme (`CheckCircle2` icon, `bg-green-100 text-green-800`)
- `in_progress` - Blue theme (`RefreshCw` icon, `bg-blue-100 text-blue-800`)
- `completed` - Purple theme (`CheckCircle2` icon, `bg-purple-100 text-purple-800`)
- `cancelled` - Red theme (`XCircle` icon, `bg-red-100 text-red-800`)

Each includes: `icon`, `label`, `color`, `bgColor`, `textColor`, `badgeClass`

### Transfer Priorities
- `low` - Green theme (`Flag` icon, `text-green-500`, dot: `bg-green-500`)
- `medium` - Amber theme (`Flag` icon, `text-amber-500`, dot: `bg-amber-500`)
- `high` - Orange theme (`Flag` icon, `text-orange-500`, dot: `bg-orange-500`)
- `urgent` - Red theme (`AlertTriangle` icon, `text-red-500`, dot: `bg-red-500`)

Each includes: `icon`, `label`, `color`, `bgColor`, `dotColor`, `badgeClass`

### Stat Card Colors
- `total` - Beige theme (custom warm color)
- `pending` - Amber theme (`bg-amber-50`, `text-amber-500`)
- `inProgress` - Blue theme (`bg-blue-50`, `text-blue-500`)
- `urgent` - Red theme (`bg-red-50`, `text-red-500`)
- `completed` - Purple theme (`bg-purple-50`, `text-purple-500`)
- `cancelled` - Gray theme (`bg-gray-50`, `text-gray-500`)

Each includes: `bg`, `border`, `iconBg`, `iconColor`, `textColor`, `valueColor`

## ✅ Benefits

1. **Consistency** - Same styles across all pages
2. **Maintainability** - Update once, changes everywhere
3. **Type Safety** - Full TypeScript support
4. **Documentation** - Self-documenting code
5. **Performance** - No duplicate style definitions
6. **Scalability** - Easy to add new configurations

## 🚀 Best Practices

1. **Always use the centralized configs** instead of hardcoded values
2. **Import only what you need** to keep bundle size small
3. **Use helper functions** (`getTransferCategoryConfig`, etc.) for dynamic values
4. **Extend configs** in `theme.ts` or `transferStyles.ts` for new patterns
5. **Keep configs updated** when design changes

## 📝 Adding New Configurations

To add a new transfer status, priority, or category:

1. Open `/src/constants/transferStyles.ts`
2. Add your new configuration to the appropriate object
3. Update the TypeScript type if needed
4. Use it throughout your components

Example:
```typescript
// Add new status
export const TRANSFER_STATUSES = {
  // ... existing statuses
  reviewing: {
    icon: Eye,
    label: "Under Review",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-800",
    badgeClass: "bg-indigo-100 text-indigo-800",
  },
} as const;
```

## 🔧 Migration

When refactoring existing code:

1. Import the configuration: `import { getTransferStatusConfig } from "@/constants"`
2. Replace hardcoded values: `const statusConfig = getTransferStatusConfig(transfer.status)`
3. Use the config values: `className={statusConfig.badgeClass}`
4. Remove old switch/case statements

