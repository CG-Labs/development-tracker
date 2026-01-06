# Changelog

All notable changes to DevTracker will be documented in this file.

## [Unreleased]

### Added
- Permission guards on admin-only routes (AuditLog, ManageDevelopments, IncentiveSchemesPage)
- Environment files added to .gitignore for security
- Improved Firestore security rules for invites collection

### Changed
- Updated vite.config.ts chunk size warning limit for large data files
- Refactored SortIcon component outside of DevelopmentDetail for performance
- Converted cumulative calculations in ProgressMonitoring to reduce pattern

### Removed
- Unused progressData.ts file
- Unused PermissionGate.tsx component
- Unused usePermission.ts hook

### Fixed
- ESLint errors in all components
- React hooks order violations in multiple components
- Missing useCallback/useMemo dependencies
- Fast Refresh compatibility issues with context hooks

## [1.2.0] - 2025-01-05

### Added
- Manager role (4-level role hierarchy: Admin, Manager, Editor, Viewer)
- Magic link invite system with secure tokens
- SendGrid email integration for invitations
- Access Denied page for unauthorized users
- In-app notification system
- Notification bell with unread count
- Audit logging for user management actions

### Changed
- Refactored UserManagement component for role management
- Updated Firestore security rules for new user system
- Enhanced invite flow with expiration and resend

### Security
- Invite tokens use cryptographically secure random generation
- Invites expire after 7 days
- Email normalization to prevent duplicate accounts

## [1.1.0] - 2025-01-04

### Added
- Incentive schemes management
- Theme toggle (light/dark mode)
- Company logo upload feature
- Progress monitoring charts

### Changed
- Improved Dashboard layout
- Enhanced unit detail modal with editing

## [1.0.0] - 2025-01-01

### Added
- Initial release
- Development portfolio dashboard
- Unit tracking and management
- Construction and sales status tracking
- Documentation checklist
- Report generation (PDF, Excel)
- Firebase Authentication
- Firestore database
- Firebase Hosting deployment
