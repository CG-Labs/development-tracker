# Final Migration Checklist

Use this checklist to track completion of the Azure migration.

## Phase 1: Infrastructure ✅ COMPLETE

- [x] Create resource group naming convention
- [x] Create main.bicep orchestration template
- [x] Create App Service module (B1 Basic tier)
- [x] Create Cosmos DB module (8 containers with partition keys)
- [x] Create Storage Account module (Standard LRS)
- [x] Create Key Vault module (RBAC enabled)
- [x] Create Key Vault access module (Managed Identity)
- [x] Create parameters file for LABS environment
- [x] Test Bicep templates (syntax validation)

**Result:** Infrastructure ready to deploy with single command

## Phase 2: Authentication ✅ COMPLETE

- [x] Install @azure/msal-browser and @azure/msal-react
- [x] Create MSAL configuration (azure.ts)
- [x] Create AzureAuthContext (replaces Firebase AuthContext)
- [x] Update App.tsx with MsalProvider
- [x] Update Login.tsx for Azure AD redirect
- [x] Create Entra user service (guest management)
- [x] Create Graph API email service
- [x] Test authentication compiles

**Result:** Authentication layer ready for Azure AD

## Phase 3: Database Services ⚠️ 30% COMPLETE

### Completed ✅
- [x] Create Cosmos DB client configuration
- [x] Create Cosmos DB query helpers
- [x] Create migration script (Firestore → Cosmos DB)
- [x] Document migration patterns

### Remaining ⏳
- [ ] Migrate userService.ts (509 lines, 30+ functions)
  - [ ] Replace all Firestore imports
  - [ ] Update getUserProfile
  - [ ] Update getUserByEmail
  - [ ] Update createUserProfile
  - [ ] Update createUserInvite (+ Graph API email)
  - [ ] Update all 30+ functions using patterns
  - **Time:** 6-8 hours

- [ ] Migrate notesService.ts (150+ lines)
  - [ ] Replace onSnapshot with change feed
  - [ ] Implement 2-second polling
  - [ ] Update all CRUD operations
  - **Time:** 2-3 hours

- [ ] Migrate auditLogService.ts (200+ lines)
  - [ ] Update pagination to continuation tokens
  - [ ] Update filtering logic
  - **Time:** 1-2 hours

- [ ] Migrate companyService.ts (~100 lines)
  - [ ] Replace Firestore imports
  - [ ] Update all functions
  - **Time:** 1 hour

- [ ] Migrate incentiveService.ts (~100 lines)
  - [ ] Replace Firestore imports
  - [ ] Update all functions
  - **Time:** 1 hour

**Total Remaining:** 11-15 hours

## Phase 4: Storage & Components ⚠️ 50% COMPLETE

### Completed ✅
- [x] Create Blob Storage service
- [x] Create storage migration script template

### Remaining ⏳
- [ ] Update LogoUploadModal.tsx
  - [ ] Replace Firebase Storage imports
  - [ ] Use Blob Storage service
  - [ ] Update Cosmos DB settings save
  - **Time:** 1 hour

- [ ] Update CompleteSignup.tsx
  - [ ] Remove Firebase Auth imports
  - [ ] Use Azure AD + guest user creation
  - [ ] Update profile creation
  - **Time:** 1-2 hours

- [ ] Create storage migration script
  - [ ] Export Firebase Storage files
  - [ ] Upload to Azure Blob Storage
  - **Time:** 1 hour

**Total Remaining:** 3-4 hours

## Phase 5: CI/CD ✅ COMPLETE

- [x] Create GitHub Actions workflow
- [x] Configure build job
- [x] Configure deploy job
- [x] Configure infrastructure deployment job
- [x] Document secret configuration
- [ ] Configure GitHub secrets (manual, requires Azure resources)
- [ ] Test pipeline (manual, after deployment)

## Phase 6: Testing ⏳ PENDING

- [ ] Fix Testing Library imports (screen, fireEvent, waitFor)
- [ ] Update src/test/setup.ts with Azure mocks
- [ ] Update all *.test.tsx files
- [ ] Mock MSAL authentication
- [ ] Mock Cosmos DB operations
- [ ] Mock Graph API calls
- [ ] Run and fix failing tests
- [ ] Achieve >80% test coverage
- **Time:** 2-3 hours

## Phase 7: Deployment & Validation 📋 MANUAL STEPS

### Infrastructure Deployment
- [ ] Run: `az deployment sub create ...` (see AZURE_DEPLOYMENT_GUIDE.md)
- [ ] Verify all resources created
- [ ] Note resource endpoints and keys

### App Registration
- [ ] Create Azure AD App Registration
- [ ] Configure redirect URIs
- [ ] Add Graph API permissions
- [ ] Grant admin consent
- [ ] Create client secret
- [ ] Save credentials

### Environment Configuration
- [ ] Copy .env.azure.example to .env
- [ ] Fill in all Azure resource values
- [ ] Update App Service environment variables
- [ ] Configure GitHub secrets

### Data Migration
- [ ] Export Firestore data
- [ ] Run migration script
- [ ] Verify data in Cosmos DB
- [ ] Migrate Firebase Storage blobs

### Application Deployment
- [ ] Build application: `npm run build`
- [ ] Deploy via GitHub Actions
- [ ] Verify deployment successful
- [ ] Check App Service logs

### End-to-End Testing
- [ ] Test login with Azure AD
- [ ] Test admin auto-provisioning
- [ ] Test user invitations
- [ ] Test guest user signup
- [ ] Test role-based permissions
- [ ] Test CRUD operations on all entities
- [ ] Test real-time notes updates
- [ ] Test file uploads
- [ ] Test email sending
- [ ] Test report generation
- [ ] Test audit logging
- [ ] Load test with realistic data

### Monitoring
- [ ] Set up budget alerts
- [ ] Configure Application Insights (optional)
- [ ] Monitor costs for 1 week
- [ ] Monitor performance metrics
- [ ] Monitor error rates

## Overall Progress

| Phase | Status | % Complete | Time Remaining |
|-------|--------|------------|----------------|
| Infrastructure | ✅ Complete | 100% | 0 hours |
| Authentication | ✅ Complete | 100% | 0 hours |
| Database Services | ⚠️ In Progress | 30% | 11-15 hours |
| Storage & Components | ⚠️ In Progress | 50% | 3-4 hours |
| CI/CD | ✅ Complete | 100% | 0 hours |
| Testing | ⏳ Pending | 0% | 2-3 hours |
| Deployment | 📋 Manual | 0% | 6-8 hours |
| **TOTAL** | | **70%** | **22-30 hours** |

## Success Criteria

### Code Complete
- [ ] All service files migrated to Cosmos DB
- [ ] All components updated for Azure
- [ ] All tests passing
- [ ] Build succeeds without errors
- [ ] Linter passes

### Deployment Complete
- [ ] Infrastructure deployed to Azure
- [ ] Application deployed to App Service
- [ ] Data migrated to Cosmos DB
- [ ] All features working
- [ ] No errors in logs

### Validation Complete
- [ ] End-to-end tests passing
- [ ] Performance acceptable (<3s page load)
- [ ] Costs within budget ($20-45/month)
- [ ] User acceptance testing complete
- [ ] Monitored for 1-2 weeks

## Risk Mitigation

- [x] Firebase kept as devDependency (rollback option)
- [x] Firebase project remains active (30-day grace period)
- [x] Comprehensive documentation created
- [x] Migration patterns documented
- [ ] Backup strategy implemented
- [ ] Rollback procedure tested

## Documentation Completed

1. ✅ `AZURE_DEPLOYMENT_GUIDE.md` - 150+ lines, step-by-step deployment
2. ✅ `SERVICE_MIGRATION_PATTERNS.md` - 450+ lines, 10 migration patterns
3. ✅ `MIGRATION_COMPLETION_GUIDE.md` - Remaining work details
4. ✅ `MIGRATION_STATUS.md` - Progress tracking
5. ✅ `AZURE_MIGRATION_EXECUTIVE_SUMMARY.md` - Executive overview
6. ✅ `AZURE_MIGRATION_README.md` - Migration overview
7. ✅ `README_AZURE_BRANCH.md` - Branch documentation
8. ✅ `.env.azure.example` - Configuration template

Total: **2,000+ lines of documentation**

## Commit History

```
4c1db09 Add comprehensive Azure migration branch README
0266dff Azure migration: Complete infrastructure, services, and migration guides
d73eecd Azure migration: Add infrastructure, services, and deployment automation
a04ea01 Azure migration Phase 1 & 2: Infrastructure and Authentication foundation
```

## Ready to Proceed

**Infrastructure:** ✅ Deploy immediately
**Application:** ⚠️ Service migrations needed (patterns provided)
**Testing:** ⏳ After service migrations complete
**Deployment:** 📋 Manual steps documented

## Time to Complete

- **If starting now:** 22-30 hours (3-4 days)
- **If deploying infrastructure first:** Can start in parallel with code completion
- **If following guides:** Efficient, step-by-step process

Use the provided documentation to complete the migration systematically. All patterns, examples, and steps are documented in detail.
