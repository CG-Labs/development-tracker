# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production (runs TypeScript check then Vite build)
- `npm run preview` - Preview production build locally

### Testing
- `npm test` - Run tests in watch mode
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:run` - Run tests once (CI mode)
- `npm run test:coverage` - Run tests with coverage report

### Code Quality
- `npm run lint` - Run ESLint on all files

### Deployment
- `firebase deploy` - Deploy everything (hosting + firestore rules)
- `firebase deploy --only hosting` - Deploy only the built app
- `firebase deploy --only firestore:rules` - Deploy only security rules
- `firebase deploy --only functions` - Deploy only cloud functions

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Backend**: Firebase (Firestore + Authentication + Hosting)
- **Testing**: Vitest + Testing Library
- **Excel**: ExcelJS for imports/exports
- **PDF**: jsPDF for report generation
- **Charts**: Recharts for data visualization

### Key Architectural Patterns

#### Firebase-First Architecture
- All data is stored in Firestore with real-time sync
- Development data is bootstrapped from `src/data/realDevelopments.ts` but can be overridden via Excel imports
- Unit overrides are persisted to localStorage and Firestore
- Security enforced at Firestore level via `firestore.rules`

#### Authentication & Authorization
- **Invite-only system**: Users cannot self-register without invitation
- **Role-based permissions** (4 tiers): Admin > Manager > Editor > Viewer
- **Admin emails** bypass invite system (configured via `VITE_ADMIN_EMAILS` env var)
- **AuthContext** (`src/contexts/AuthContext.tsx`):
  - Manages authentication state and user profile
  - Implements access denial logic for unauthorized users
  - Provides `can(permission)` helper for permission checks
  - Auto-creates admin profiles for configured admin emails
- **Permission system** (`src/types/roles.ts`):
  - Maps permissions to roles via `ROLE_PERMISSIONS`
  - Use `hasPermission(role, permission)` to check access
  - All permissions are enforced both client-side and in Firestore rules

#### State Management
- **Contexts**: AuthContext and ThemeContext for global state
- **Local state**: React useState for component-level state
- **No Redux/Zustand**: Simple context-based approach sufficient for this app

#### Data Layer Services
All business logic lives in `src/services/`:
- `userService.ts` - User management, invites, notifications
- `auditLogService.ts` - Change tracking for all data mutations
- `excelImportService.ts` - Parse and validate Excel imports with change detection
- `excelExportService.ts` - Generate Excel exports from development data
- `reportService.ts` - Generate PDF reports (12-week lookahead, sales activity)
- `incentiveService.ts` - Manage buyer incentive schemes
- `notesService.ts` - Unit-level notes
- `bulkUpdateService.ts` - Batch update multiple units
- `emailService.ts` - Queue emails in Firestore for Cloud Function processing
- `companyService.ts` - Company settings and logo management

#### Component Organization
- **Pages**: Top-level route components (Dashboard, DevelopmentDetail, etc.)
- **Components**: Reusable UI components and feature components
- **Lazy loading**: Non-critical routes lazy-loaded for performance (see `App.tsx`)
- **Error boundaries**: `ErrorBoundary.tsx` catches and displays errors gracefully

#### Excel Import/Export Architecture
- **Import flow**:
  1. User uploads Excel file via `ImportModal`
  2. `excelImportService.parseExcel()` parses and validates
  3. Returns `ImportResult` with changes, errors, warnings
  4. User reviews changes with "Select All" and individual row selection
  5. User can select "Updates Only" to filter rows with changes
  6. `applyImport()` persists selected changes to localStorage + Firestore
  7. Audit log created for each change
- **Export flow**:
  1. User selects developments via `ExportModal`
  2. `excelExportService` generates workbook with formatting
  3. Downloads as `.xlsx` file

#### Development & Unit Data Model
- **Development** (`src/types/index.ts`):
  - Has project number, name, status, currency, VAT rates
  - Contains array of Units
  - Can have development-level restrictions per user
- **Unit**:
  - Construction status: "Not Started" | "In Progress" | "Complete"
  - Sales status: "Not Released" | "For Sale" | "Under Offer" | "Contracted" | "Complete"
  - Documentation checklist (BCMS, Homebond, BER, etc.)
  - Key dates (planned/actual BCMS, planned/actual close)
  - Purchaser information (name, type, contact info)
  - Incentive tracking

#### Firestore Collections
- `users` - User profiles with roles and permissions
- `invites` - Pending user invitations with magic link tokens
- `notifications` - User notifications (invite accepted, role changed, etc.)
- `developments` - Development data
- `developments/{id}/units` - Unit subcollection (per development)
- `auditLogs` - Complete audit trail of all changes
- `notes` - Unit-level notes with rich text
- `incentiveSchemes` - Buyer incentive programs
- `settings` - Company settings (logo, etc.)
- `savedReports` - User-saved report configurations
- `reportTemplates` - Custom report templates
- `emailQueue` - Email queue for SendGrid processing (via Cloud Function)

#### Permission-Gated Features
Always check permissions before rendering features:
```typescript
const { can } = useAuth();

if (can("editUnit")) {
  // Render edit UI
}
```

Common patterns:
- Import data: `can("importData")` - Admin only
- Export data: `can("exportData")` - Admin + Manager
- Edit units: `can("editUnit")` - Admin + Manager + Editor
- Manage users: `can("manageUsers")` - Admin only
- View audit log: `can("viewAuditLog")` - Admin only
- Generate reports: `can("generateReports")` - Admin + Manager

#### Theme System
- Light and dark modes via `ThemeContext`
- CSS variables in `index.css` for theme values
- Blueprint-inspired design system with accent colors (cyan, purple, gold)

## Important Implementation Details

### Change Tracking & Audit Logs
**ALL data mutations must be logged**. When updating units or developments:
```typescript
import { logChange } from './services/auditLogService';

// After making a change
await logChange(
  userId,
  'unit_updated',
  `Updated unit ${unitNumber} in ${developmentName}`,
  { changes }
);
```

### Unit Overrides System
- Base data from `src/data/realDevelopments.ts`
- Overrides stored in localStorage (`devtracker_unit_overrides`)
- Overrides also synced to Firestore for multi-device access
- Use `excelImportService.loadUnitOverrides()` to load on app start

### Testing Patterns
- Tests use Vitest with jsdom environment
- Mock Firebase in `src/test/setup.ts`
- Always mock Firebase services in tests
- Use `@testing-library/react` for component tests
- Coverage reports in `coverage/` directory

### Build Configuration
- Vite config in `vite.config.ts`
- Manual chunk splitting for optimal bundle sizes:
  - `vendor-react` - React core
  - `vendor-firebase` - Firebase SDK (largest dependency)
  - `vendor-pdf` - jsPDF for reports
  - `vendor-charts` - Recharts
  - `vendor-exceljs` - ExcelJS
- Chunk size warning limit: 800KB (due to large development data file)

### Firebase Security Rules
- All rules in `firestore.rules`
- Helper functions: `isAdmin()`, `isManagerOrAdmin()`, `isEditorOrHigher()`, `isActiveUser()`
- Development access controlled via `allowedDevelopments` array on user profile
- Invites readable by unauthenticated users (for magic link validation)
- Email queue can only be created by authenticated users
- Audit logs: create (all users), read (managers/admins only), no updates/deletes

### Environment Variables
Required in `.env`:
```
VITE_ADMIN_EMAILS=admin@example.com,admin2@example.com
VITE_SENDGRID_API_KEY=your_key
VITE_SENDGRID_FROM_EMAIL=noreply@yourdomain.com
VITE_SENDGRID_FROM_NAME=DevTracker
VITE_APP_URL=https://your-project.web.app
```

### Email System Architecture
1. Frontend calls `emailService.queueInvitationEmail()`
2. Email document created in `emailQueue` collection
3. Cloud Function (`processEmailQueue`) triggered on document create
4. Function sends email via SendGrid
5. Updates document status to "sent" or "failed"

See `DEPLOYMENT.md` for Cloud Function implementation.

## Common Gotchas

### Windows Path Handling
This project uses Windows-style paths (`C:\dev\...`). When writing scripts or tools, handle both forward and back slashes.

### Firestore Timestamp Conversion
When reading dates from Firestore, convert Timestamp to Date:
```typescript
const date = doc.data().createdAt?.toDate();
```

### Unit Number Uniqueness
Unit numbers must be unique within a development but NOT globally. Always scope queries by developmentId.

### Development Restrictions
- Admins and Managers see all developments by default
- Editors and Viewers only see developments in their `allowedDevelopments` array
- Empty/null `allowedDevelopments` = access to all (admin/manager only)

### Excel Import Validation
The import service performs extensive validation:
- Required fields (development name, unit number)
- Enum validation (construction status, sales status, unit type)
- Date format validation (YYYY-MM-DD or Excel date)
- Price validation (numeric, positive)
- Duplicate detection (same unit number in same development)

Always show warnings to users even if import is valid.

### Report Generation Performance
PDF reports can be large. Use dynamic imports for report service:
```typescript
const getReportService = () => import("./services/reportService");
const reportService = await getReportService();
reportService.download12WeekLookahead("pdf", devIds);
```

### React 19 Patterns
This project uses React 19. Be aware of:
- No more implicit children in FC types
- `ReactNode` explicitly typed where needed
- New JSX transform
