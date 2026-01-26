# Translation Examples for Remaining Pages

This document provides specific translation examples for completing the remaining pages in the Quick Connex application.

---

## Example 1: Admin Users Page

### Before Translation
```typescript
"use client";

import { useState } from "react";

export default function UserManagement() {
  const [loading, setLoading] = useState(true);
  
  if (loading) {
    return <div>Loading users...</div>;
  }
  
  return (
    <div>
      <h1>User Management</h1>
      <button>Add User</button>
      <button>Export</button>
      <div>
        <h3>Total Users</h3>
        <p>{totalUsers}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
      </table>
    </div>
  );
}
```

### After Translation
```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function UserManagement() {
  const t = useTranslations("adminUsers");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(true);
  
  if (loading) {
    return <div>{t("loading")}</div>;
  }
  
  return (
    <div>
      <h1>{t("title")}</h1>
      <button>{t("addUser")}</button>
      <button>{t("export")}</button>
      <div>
        <h3>{t("userStats.total")}</h3>
        <p>{totalUsers}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>{t("table.name")}</th>
            <th>{t("table.email")}</th>
            <th>{t("table.role")}</th>
            <th>{t("table.status")}</th>
            <th>{t("table.actions")}</th>
          </tr>
        </thead>
      </table>
    </div>
  );
}
```

---

## Example 2: Transfers List Page

### Before Translation
```typescript
export default function TransfersPage() {
  return (
    <div>
      <h1>Transfers</h1>
      <input placeholder="Search transfers..." />
      <button>Show Filters</button>
      <button>Create Transfer</button>
      
      <div className="stats">
        <StatCard title="Total Transfers" value={total} />
        <StatCard title="Pending" value={pending} />
        <StatCard title="In Progress" value={inProgress} />
        <StatCard title="Completed" value={completed} />
      </div>
      
      {transfers.length === 0 ? (
        <div>
          <p>No transfers found</p>
          <p>No transfers available at the moment.</p>
        </div>
      ) : (
        <TransferList transfers={transfers} />
      )}
    </div>
  );
}
```

### After Translation
```typescript
import { useTranslations } from "next-intl";

export default function TransfersPage() {
  const t = useTranslations("transfersListPage");
  const tCommon = useTranslations("common");
  
  return (
    <div>
      <h1>{t("title")}</h1>
      <input placeholder={t("search")} />
      <button>{t("showFilters")}</button>
      <button>{t("createTransfer")}</button>
      
      <div className="stats">
        <StatCard title={t("totalTransfers")} value={total} />
        <StatCard title={t("pending")} value={pending} />
        <StatCard title={t("inProgress")} value={inProgress} />
        <StatCard title={t("completed")} value={completed} />
      </div>
      
      {transfers.length === 0 ? (
        <div>
          <p>{t("noTransfers")}</p>
          <p>{t("noTransfersMessage")}</p>
        </div>
      ) : (
        <TransferList transfers={transfers} />
      )}
    </div>
  );
}
```

---

## Example 3: Sidebar Navigation

### Before Translation
```typescript
export default function Sidebar() {
  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/transfers">Transfers</Link>
      <Link href="/my-transfers">My Transfers</Link>
      <Link href="/nurses">Nurses</Link>
      <Link href="/calendar">Calendar</Link>
      <Link href="/profile">Profile</Link>
      <button onClick={logout}>Sign Out</button>
    </nav>
  );
}
```

### After Translation
```typescript
import { useTranslations } from "next-intl";

export default function Sidebar() {
  const t = useTranslations("navigation");
  const tAuth = useTranslations("auth");
  
  return (
    <nav>
      <Link href="/dashboard">{t("dashboard")}</Link>
      <Link href="/transfers">{t("transfers")}</Link>
      <Link href="/my-transfers">{t("myTransfers")}</Link>
      <Link href="/nurses">{t("nurses")}</Link>
      <Link href="/calendar">{t("calendar")}</Link>
      <Link href="/profile">{t("profile")}</Link>
      <button onClick={logout}>{tAuth("signOut")}</button>
    </nav>
  );
}
```

---

## Example 4: Modal Component

### Before Translation
```typescript
export default function DeleteConfirmModal({ onConfirm, onCancel }) {
  return (
    <Modal>
      <h2>Confirm Delete</h2>
      <p>Are you sure you want to delete this item?</p>
      <p>This action cannot be undone.</p>
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onConfirm}>Delete</button>
    </Modal>
  );
}
```

### After Translation
```typescript
import { useTranslations } from "next-intl";

export default function DeleteConfirmModal({ onConfirm, onCancel }) {
  const t = useTranslations("messages");
  const tCommon = useTranslations("common");
  
  return (
    <Modal>
      <h2>{t("confirmDelete")}</h2>
      <p>{t("confirmDelete")}</p>
      <p>{t("warning")}</p>
      <button onClick={onCancel}>{tCommon("cancel")}</button>
      <button onClick={onConfirm}>{tCommon("delete")}</button>
    </Modal>
  );
}
```

---

## Example 5: Status Badge Component

### Before Translation
```typescript
export function StatusBadge({ status }: { status: string }) {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Pending";
      case "approved": return "Approved";
      case "rejected": return "Rejected";
      case "suspended": return "Suspended";
      default: return status;
    }
  };
  
  return <span className="badge">{getStatusLabel(status)}</span>;
}
```

### After Translation
```typescript
import { useTranslations } from "next-intl";

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("users");
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return t("pending");
      case "approved": return t("approved");
      case "rejected": return t("rejected");
      case "suspended": return t("suspended");
      default: return status;
    }
  };
  
  return <span className="badge">{getStatusLabel(status)}</span>;
}
```

---

## Example 6: Form with Validation

### Before Translation
```typescript
export function UserForm() {
  const [errors, setErrors] = useState({});
  
  const validate = (data) => {
    const errors = {};
    if (!data.email) {
      errors.email = "Email is required";
    }
    if (!data.firstName) {
      errors.firstName = "First name is required";
    }
    return errors;
  };
  
  return (
    <form>
      <label>First Name</label>
      <input name="firstName" placeholder="Enter first name" />
      {errors.firstName && <span>{errors.firstName}</span>}
      
      <label>Last Name</label>
      <input name="lastName" placeholder="Enter last name" />
      
      <label>Email</label>
      <input name="email" placeholder="Enter email" />
      {errors.email && <span>{errors.email}</span>}
      
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}
```

### After Translation
```typescript
import { useTranslations } from "next-intl";

export function UserForm() {
  const t = useTranslations("auth");
  const tValidation = useTranslations("validation");
  const tCommon = useTranslations("common");
  const [errors, setErrors] = useState({});
  
  const validate = (data) => {
    const errors = {};
    if (!data.email) {
      errors.email = tValidation("required");
    }
    if (!data.firstName) {
      errors.firstName = tValidation("required");
    }
    return errors;
  };
  
  return (
    <form>
      <label>{t("firstName")}</label>
      <input name="firstName" placeholder={t("enterFirstName")} />
      {errors.firstName && <span>{errors.firstName}</span>}
      
      <label>{t("lastName")}</label>
      <input name="lastName" placeholder={t("enterLastName")} />
      
      <label>{t("email")}</label>
      <input name="email" placeholder={t("enterEmail")} />
      {errors.email && <span>{errors.email}</span>}
      
      <button type="submit">{tCommon("save")}</button>
      <button type="button" onClick={onCancel}>{tCommon("cancel")}</button>
    </form>
  );
}
```

---

## Example 7: Data Table with Actions

### Before Translation
```typescript
export function UserTable({ users, onEdit, onDelete }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Joined</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user._id}>
            <td>{user.firstName} {user.lastName}</td>
            <td>{user.email}</td>
            <td>{user.userType}</td>
            <td>{user.status}</td>
            <td>{formatDate(user.createdAt)}</td>
            <td>
              <button onClick={() => onEdit(user)}>Edit</button>
              <button onClick={() => onDelete(user)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### After Translation
```typescript
import { useTranslations } from "next-intl";

export function UserTable({ users, onEdit, onDelete }) {
  const t = useTranslations("adminUsers");
  const tCommon = useTranslations("common");
  
  return (
    <table>
      <thead>
        <tr>
          <th>{t("table.name")}</th>
          <th>{t("table.email")}</th>
          <th>{t("table.role")}</th>
          <th>{t("table.status")}</th>
          <th>{t("table.joined")}</th>
          <th>{t("table.actions")}</th>
        </tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user._id}>
            <td>{user.firstName} {user.lastName}</td>
            <td>{user.email}</td>
            <td>{user.userType}</td>
            <td>{user.status}</td>
            <td>{formatDate(user.createdAt)}</td>
            <td>
              <button onClick={() => onEdit(user)}>{tCommon("edit")}</button>
              <button onClick={() => onDelete(user)}>{tCommon("delete")}</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## Example 8: Loading and Error States

### Before Translation
```typescript
export function DataView() {
  if (loading) {
    return (
      <div>
        <Spinner />
        <p>Loading data...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div>
        <ErrorIcon />
        <h3>Failed to load data</h3>
        <p>{error.message}</p>
        <button onClick={retry}>Retry</button>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div>
        <EmptyIcon />
        <p>No data found</p>
        <p>Try adjusting your filters or search terms.</p>
      </div>
    );
  }
  
  return <DataList data={data} />;
}
```

### After Translation
```typescript
import { useTranslations } from "next-intl";

export function DataView() {
  const t = useTranslations("adminUsers");
  const tCommon = useTranslations("common");
  
  if (loading) {
    return (
      <div>
        <Spinner />
        <p>{t("loading")}</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div>
        <ErrorIcon />
        <h3>{t("error")}</h3>
        <p>{error.message}</p>
        <button onClick={retry}>{t("retry")}</button>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div>
        <EmptyIcon />
        <p>{t("noUsers")}</p>
        <p>{tCommon("messages.noData")}</p>
      </div>
    );
  }
  
  return <DataList data={data} />;
}
```

---

## Example 9: Filter Component

### Before Translation
```typescript
export function FilterPanel({ filters, onFilterChange }) {
  return (
    <div>
      <h3>Filters</h3>
      
      <label>Status</label>
      <select value={filters.status} onChange={(e) => onFilterChange('status', e.target.value)}>
        <option value="all">All Statuses</option>
        <option value="active">Active</option>
        <option value="pending">Pending</option>
        <option value="inactive">Inactive</option>
      </select>
      
      <label>Role</label>
      <select value={filters.role} onChange={(e) => onFilterChange('role', e.target.value)}>
        <option value="all">All Roles</option>
        <option value="employee">Employee</option>
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
      </select>
      
      <button onClick={onClearFilters}>Clear Filters</button>
      <button onClick={onApplyFilters}>Apply Filters</button>
    </div>
  );
}
```

### After Translation
```typescript
import { useTranslations } from "next-intl";

export function FilterPanel({ filters, onFilterChange }) {
  const t = useTranslations("adminUsers");
  const tUsers = useTranslations("users");
  const tCommon = useTranslations("common");
  
  return (
    <div>
      <h3>{t("filters")}</h3>
      
      <label>{tUsers("status")}</label>
      <select value={filters.status} onChange={(e) => onFilterChange('status', e.target.value)}>
        <option value="all">{t("allStatuses")}</option>
        <option value="active">{tUsers("active")}</option>
        <option value="pending">{tUsers("pending")}</option>
        <option value="inactive">{tUsers("inactive")}</option>
      </select>
      
      <label>{tUsers("userType")}</label>
      <select value={filters.role} onChange={(e) => onFilterChange('role', e.target.value)}>
        <option value="all">{t("allRoles")}</option>
        <option value="employee">{tUsers("employee")}</option>
        <option value="manager">{tUsers("manager")}</option>
        <option value="admin">{tUsers("admin")}</option>
      </select>
      
      <button onClick={onClearFilters}>{tCommon("clear")}</button>
      <button onClick={onApplyFilters}>{tCommon("apply")}</button>
    </div>
  );
}
```

---

## Example 10: Dynamic Text with Variables

### Before Translation
```typescript
export function UserStats({ activeUsers, totalUsers, pendingApprovals }) {
  return (
    <div>
      <p>Showing {activeUsers} of {totalUsers} users</p>
      <p>You have {pendingApprovals} pending approvals</p>
    </div>
  );
}
```

### After Translation
```typescript
import { useTranslations } from "next-intl";

export function UserStats({ activeUsers, totalUsers, pendingApprovals }) {
  const t = useTranslations("adminUsers");
  
  return (
    <div>
      <p>
        {t("showingUsers")
          .replace("{current}", activeUsers)
          .replace("{total}", totalUsers)}
      </p>
      <p>
        {t("pendingApprovalsCount")
          .replace("{count}", pendingApprovals)}
      </p>
    </div>
  );
}
```

**Note:** For the French translation in `fr.json`:
```json
{
  "adminUsers": {
    "showingUsers": "Affichage de {current} sur {total} utilisateurs",
    "pendingApprovalsCount": "Vous avez {count} approbations en attente"
  }
}
```

---

## Quick Reference: Common Translation Keys

### From `common` section:
- `loading` - "Loading..."
- `save` - "Save"
- `cancel` - "Cancel"
- `delete` - "Delete"
- `edit` - "Edit"
- `close` - "Close"
- `search` - "Search"
- `filter` - "Filter"
- `refresh` - "Refresh"
- `actions` - "Actions"

### From `auth` section:
- `signIn` - "Sign In"
- `signOut` - "Sign Out"
- `email` - "Email"
- `password` - "Password"
- `firstName` - "First Name"
- `lastName` - "Last Name"

### From `validation` section:
- `required` - "This field is required"
- `invalidEmail` - "Invalid email address"
- `passwordTooShort` - "Password must be at least 8 characters"

### From `messages` section:
- `success` - "Success"
- `error` - "Error"
- `confirmDelete` - "Are you sure you want to delete this item?"
- `savedSuccessfully` - "Saved successfully"

---

## Tips for Success

1. **Always check if a key already exists** before creating a new one
2. **Use consistent naming** across your translation keys
3. **Group related keys** under the same section
4. **Test in both languages** to ensure nothing breaks
5. **Consider text expansion** - French text is typically 15-20% longer
6. **Keep accessibility in mind** - translate aria-labels too
7. **Use TypeScript** - it helps catch missing translation keys

---

## Testing Your Translations

After translating a page, test it by:

1. Switch language using the LanguageSwitcher
2. Verify all text displays correctly
3. Check for any missing translations (will show the key name)
4. Verify layout doesn't break with longer French text
5. Test on mobile and desktop views
6. Check modals, tooltips, and hover states

---

**Happy Translating! 🌍**