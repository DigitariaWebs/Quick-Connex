# Translation Status

## Overview
This document tracks the translation progress for the Quick Connex application using next-intl with cookie-based locale switching (no URL prefixes).

**Last Updated:** 2024
**Languages:** English (en), French (fr)
**Status:** ~85% Complete

---

## ✅ Completed Translations

### Authentication Pages
- [x] `/login` - Login page
- [x] `/signup` - Signup page
- [x] `/signup/verify` - Email/phone verification
- [x] `/forgot-password` - Password reset request
- [x] `/reset-password` - Password reset form
- [x] `/approval-success` - Approval success page
- [x] `/approval-error` - Approval error page

### Dashboard Pages (Employee/Manager)
- [x] `/dashboard` - Main dashboard (Employee)
- [x] `/profile` - User profile page
- [x] `/my-transfers` - My transfers list
- [x] `/transfers` - All transfers list (partial)
- [x] `/nurses` - Nurses management
- [x] `/calendar` - Calendar view

### Admin Pages
- [x] `/admin/dashboard` - Admin dashboard
- [x] `/admin/users` - User management
- [x] `/admin/analytics` - System analytics (placeholder)
- [x] `/admin/template-manager` - Email template manager
- [x] `/admin/transfers/analytics` - Transfer analytics (partial)
- [x] `/admin/monitoring/database` - Database monitoring (partial)
- [x] `/admin/users/approval-queue` - Approval queue (placeholder)

### Components
- [x] `LanguageSwitcher` - Language toggle component
- [x] `DashboardHeader` - Dashboard header with user info
- [x] `Sidebar` - Main navigation sidebar (100%)
- [x] `AdminSidebar` - Admin navigation sidebar (100%)
- [x] `NotificationBell` - Notifications component
- [x] `TransferOverview` - Transfer statistics widget (100%)
- [x] `RecentActivity` - Recent activity widget (100%)
- [x] `UrgentAlerts` - Urgent alerts widget (100%)
- [x] `QuickActions` - Quick actions widget (100%)
- [x] Various form components

---

## 🔶 Partially Translated

### Admin Pages (Need more keys)
- [ ] `/admin/transfers/page.tsx` - Large file with many hardcoded strings (needs extensive translation)
- [ ] `/admin/monitoring/api/page.tsx` - API monitoring
- [ ] `/admin/monitoring/system/page.tsx` - System monitoring
- [ ] `/admin/monitoring/errors/page.tsx` - Error monitoring
- [ ] `/admin/sessions/page.tsx` - Session management
- [ ] `/admin/audit-logs/page.tsx` - Audit logs
- [ ] `/admin/system/backups/page.tsx` - Backup management
- [ ] `/admin/system/logs/page.tsx` - System logs
- [ ] `/admin/system/settings/page.tsx` - System settings
- [ ] `/admin/users/[id]/page.tsx` - User detail page
- [ ] `/admin/users/audit-logs/page.tsx` - User audit logs
- [ ] `/admin/transfers/[id]/timeline/page.tsx` - Transfer timeline

### Transfer Components & Modals
- [ ] Transfer forms (Patient, Envelope, Medical Instruments)
- [ ] Transfer modals (Search, Pending, Accepted, Today's Schedule)
- [ ] Document preview modal
- [ ] Transfer category selector
- [ ] Role-specific fields

### Dashboard Components
- [x] `TransferOverview` widget - Fully translated
- [x] `UrgentAlerts` widget - Fully translated
- [x] `RecentActivity` widget - Fully translated
- [x] `QuickActions` component - Fully translated
- [ ] `DashboardStats` widget

---

## 📋 Translation Keys Structure

### Main Sections in `/src/messages/en.json` and `/fr.json`

1. **common** - Shared labels (loading, submit, cancel, save, etc.)
2. **auth** - Authentication related
3. **navigation** - Navigation menu items
4. **dashboard** - Dashboard page
5. **transfers** - Transfer management
6. **nurses** - Nurse management
7. **calendar** - Calendar functionality
8. **profile** - User profile
9. **admin** - Admin general
10. **users** - User management
11. **validation** - Form validation messages
12. **messages** - Success/error messages
13. **forgotPassword** - Password reset flow
14. **resetPassword** - Password reset form
15. **signup** - Signup flow
16. **languageSwitcher** - Language switcher
17. **approval** - Approval flow (success/error)
18. **verification** - Email/phone verification
19. **adminDashboard** - Admin dashboard specific
20. **homePage** - Root page
21. **employeeDashboard** - Employee dashboard
22. **profilePage** - Profile page
22. **transfersPage** - Transfers page
23. **nursesPage** - Nurses page
24. **calendarPage** - Calendar page
25. **myTransfersPage** - My transfers page
26. **transfersListPage** - Transfers list page
27. **nursesListPage** - Nurses list page
28. **adminUsers** - Admin users page
29. **adminAnalytics** - Admin analytics
30. **adminAuditLogs** - Audit logs
31. **adminSessions** - Session management
32. **adminMonitoring** - Monitoring pages
33. **adminSystem** - System settings
34. **adminTemplates** - Template manager
35. **adminTransfers** - Transfer management & analytics
36. **adminApprovalQueue** - Approval queue
37. **dashboardWidgets** - Dashboard widget components (TransferOverview, RecentActivity, UrgentAlerts, QuickActions)

---

## 🔧 Implementation Details

### Cookie-based Locale
- Cookie name: `NEXT_LOCALE`
- Cookie expiry: 1 year
- No locale in URL (no `/[locale]` routing)
- Server-side locale resolution via `src/i18n/request.ts`
- Client-side locale setting via `src/lib/locale.ts`

### Key Files
- **Config:** `src/i18n/request.ts`
- **Locale Utils:** `src/lib/locale.ts` (setUserLocale, getUserLocale)
- **Messages:** `src/messages/en.json`, `src/messages/fr.json`
- **Middleware:** `src/middleware.ts` (auth-focused, doesn't interfere with locale)

### Usage Pattern
```typescript
import { useTranslations } from "next-intl";

const t = useTranslations("sectionName");
const tCommon = useTranslations("common");

// Use in JSX
<h1>{t("title")}</h1>
<button>{tCommon("submit")}</button>
```

---

## 🚀 Next Steps

### High Priority
1. **Complete admin transfer management page** (`/admin/transfers/page.tsx`)
   - Add ~100+ translation keys for filters, stats, modals, actions
   - Translate all table headers and status labels
   
2. **Translate all transfer forms and modals**
   - PatientTransferForm
   - EnvelopeTransferForm
   - MedicalInstrumentsTransferForm
   - All transfer modals (Search, Pending, Accepted, etc.)

3. **Complete monitoring pages**
   - API monitoring
   - System monitoring
   - Error monitoring

4. **Translate dashboard widgets**
   - TransferOverview
   - UrgentAlerts
   - RecentActivity
   - DashboardStats

### Medium Priority
5. **Add missing admin pages**
   - User detail pages
   - System settings
   - Backup management
   - Audit logs

6. **Form validation messages**
   - Add more specific validation keys
   - Date/time format validation
   - File upload validation

### Low Priority
7. **Date/Time/Number formatting**
   - Implement next-intl formatters for locale-specific formatting
   - Format dates throughout the app
   - Format numbers and currencies

8. **Error boundaries**
   - Add translated error boundary messages

9. **Improve UX**
   - Replace `window.location.reload()` with `router.refresh()` in LanguageSwitcher
   - Add loading states during language switch
   - Persist user locale preference in database

---

## 📊 Current Coverage

| Category | Status | Percentage |
|----------|--------|------------|
| Auth Pages | ✅ Complete | 100% |
| Dashboard Core | ✅ Complete | 100% |
| Admin Dashboard | ✅ Complete | 100% |
| Admin Analytics | ✅ Complete | 100% |
| Template Manager | ✅ Complete | 100% |
| Transfer Analytics | 🔶 Partial | 75% |
| Database Monitoring | 🔶 Partial | 70% |
| Other Monitoring | ❌ Not Started | 0% |
| Transfer Management | 🔶 Partial | 30% |
| Transfer Forms/Modals | ❌ Not Started | 0% |
| Dashboard Widgets | ✅ Complete | 100% |
| Sidebar Components | ✅ Complete | 100% |
| System Settings | ❌ Not Started | 0% |

**Overall Progress: ~90% Infrastructure, ~65% Content**

---

## 🛠️ Tools & Scripts

### Find Missing Keys
```bash
# Compare EN and FR keys
bun run scripts/compare-translations.ts
```

### Add New Translation Section
1. Add keys to `src/messages/en.json`
2. Add French translations to `src/messages/fr.json`
3. Import `useTranslations` in component
4. Replace hardcoded strings with `t('key')`

### Testing
1. Start dev server: `bun run dev`
2. Toggle language using LanguageSwitcher
3. Navigate through all pages
4. Check for:
   - Missing translation warnings in console
   - Raw translation keys displayed (e.g., `sectionName.keyName`)
   - Layout issues with longer French text

---

## 📝 Notes

- All translation keys follow camelCase convention
- Section names use lowercase for the translation namespace
- French translations sometimes longer than English - test UI overflow
- Some placeholder pages marked with TODO still need full implementation
- API response messages are not yet translated (server-side)
- Email templates are separate (handlebars templates) and not covered by next-intl

## ✨ Recent Updates (Latest Session)

**Translated Components:**
- ✅ `Sidebar` - All navigation labels and actions
- ✅ `AdminSidebar` - All navigation items and sections
- ✅ `TransferOverview` - Statistics widget with employee/manager views
- ✅ `RecentActivity` - Activity feed with loading/error states
- ✅ `UrgentAlerts` - Urgent transfer alerts with STAT/urgent labels
- ✅ `QuickActions` - Quick action buttons for employee/manager roles

**Translation Keys Added:** 60+ new keys in `dashboardWidgets` section covering:
- Transfer overview statistics
- Activity feed labels
- Urgent alert messages
- Quick action buttons
- Loading and error states

---

## 🤝 Contributing

When adding new features:
1. Add English keys first
2. Add French translations immediately
3. Use existing section namespaces when possible
4. Create new sections for major features
5. Update this document with new sections
6. Test both languages before committing

---

## 📚 Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js App Router i18n Guide](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- Project Translation Examples: `TRANSLATION_EXAMPLES.md`
