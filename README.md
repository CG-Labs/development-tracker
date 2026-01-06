# DevTracker - Property Development Management System

A comprehensive property development tracking application built with React, TypeScript, and Firebase.

## Features

### Core Functionality
- **Portfolio Dashboard** - Overview of all developments with key metrics
- **Development Management** - Track multiple property developments
- **Unit Tracking** - Detailed unit-level management with status tracking
- **Construction & Sales Status** - Track progress from construction to sale completion
- **Documentation Tracking** - Monitor BCMS, Land Registry, Homebond, contracts, and more

### User Management
- **Role-Based Access Control** - 4-tier permission system (Admin, Manager, Editor, Viewer)
- **Magic Link Invitations** - Secure invite-based user onboarding
- **Development Restrictions** - Limit user access to specific developments

### Reporting
- **Portfolio Summary Reports** - Overall portfolio performance
- **Sales Pipeline Reports** - Track sales progress and projections
- **Documentation Status Reports** - Monitor completion documentation
- **Custom Report Generator** - Configurable reports with multiple output formats

### Additional Features
- **Incentive Schemes** - Track and manage buyer incentive programs
- **Audit Logging** - Complete audit trail of all system changes
- **Theme Support** - Light and dark mode
- **Custom Branding** - Company logo upload

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication, Hosting)
- **Build Tool**: Vite
- **Charts**: Recharts
- **PDF Generation**: jsPDF
- **Excel Export**: SheetJS (xlsx)

## Getting Started

### Prerequisites
- Node.js 18 or higher
- Firebase project with Firestore and Authentication enabled
- SendGrid account (for email invitations)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd development-tracker
```

2. Install dependencies
```bash
npm install
```

3. Configure environment
```bash
cp .env.example .env
# Edit .env with your settings
```

4. Start development server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Deploy to Firebase
```bash
npm run build
firebase deploy
```

## Project Structure

```
src/
├── components/         # React components
├── contexts/          # React contexts (Auth, Theme)
├── config/            # Firebase configuration
├── data/              # Development data
├── hooks/             # Custom React hooks
├── pages/             # Page components
├── services/          # Business logic services
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## Security

- All routes are protected with Firebase Authentication
- Role-based permissions enforced at component and Firestore levels
- Invite-only user registration
- Audit logging for all data changes

## Documentation

- [Deployment Guide](DEPLOYMENT.md) - Detailed deployment instructions
- [Changelog](CHANGELOG.md) - Version history and changes

## License

Proprietary - All rights reserved

---

Built with React, TypeScript, and Firebase
