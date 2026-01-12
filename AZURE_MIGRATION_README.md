# Azure Migration - DevTracker

This branch contains the complete migration from Firebase to Azure infrastructure for the DevTracker application.

## Migration Status: IN PROGRESS

✅ **Phase 1 Complete** - Bicep infrastructure templates created
✅ **Phase 2 Complete** - Azure SDK integration and authentication setup
🔄 **Phase 3 In Progress** - Database service migration to Cosmos DB
⏳ **Phase 4 Pending** - Storage and email migration
⏳ **Phase 5 Pending** - CI/CD pipeline setup
⏳ **Phase 6 Pending** - Testing and validation
⏳ **Phase 7 Pending** - Production deployment

## What's Been Migrated

### Infrastructure (Bicep Templates)
- ✅ App Service Plan (B1 Basic tier)
- ✅ App Service (Node.js 20 LTS)
- ✅ Cosmos DB Serverless (8 containers)
- ✅ Storage Account (Blob storage for logos)
- ✅ Key Vault (secrets management)
- ✅ Managed Identity (Key Vault access)

### Authentication
- ✅ Azure AD (Entra ID) integration with MSAL.js
- ✅ AzureAuthContext replacing Firebase AuthContext
- ✅ Role-based permissions preserved
- ✅ Admin auto-provisioning maintained
- ✅ Guest user invitation flow prepared

### Azure Services
- ✅ Microsoft Graph API email service (replaces SendGrid)
- ✅ Entra ID guest user management
- ✅ Blob Storage service (replaces Firebase Storage)
- ✅ Cosmos DB client with query helpers

## Prerequisites for Deployment

1. **Azure Subscription**: ce-labs-sub
2. **Azure CLI**: Installed and authenticated
3. **Node.js**: Version 20+
4. **Permissions**: Contributor role on subscription

## Deployment Steps

### Step 1: Deploy Azure Infrastructure

```bash
# Login to Azure
az login
az account set --subscription "ce-labs-sub"

# Deploy Bicep templates (LABS environment)
cd infrastructure
az deployment sub create \
  --name ce-devtracker-labs-$(date +%Y%m%d) \
  --location eastus \
  --template-file main.bicep \
  --parameters environment=labs \
               orgPrefix=ce \
               workload=devtracker \
               adminEmails="admin@yourcompany.com" \
               aadClientId="<from-app-registration>" \
               aadTenantId="<tenant-id>" \
               aadClientSecret="<client-secret>"
```

### Step 2: Create Azure AD App Registration

```bash
# Create app registration
az ad app create \
  --display-name "ce-devtracker-labs-reg" \
  --sign-in-audience "AzureADMyOrg" \
  --web-redirect-uris "https://ce-devtracker-labs-app.azurewebsites.net/auth/callback" \
                      "http://localhost:5173/auth/callback"

# Note the Application (client) ID and create a client secret
az ad app credential reset --id <app-id> --append

# Configure API permissions (requires admin consent)
# - User.Read (Delegated)
# - Mail.Send (Application)
# - User.ReadWrite.All (Application)
# - Directory.ReadWrite.All (Application)
```

### Step 3: Configure Environment Variables

Copy `.env.azure.example` to `.env` and fill in values:

```bash
cp .env.azure.example .env
# Edit .env with your Azure resource details
```

### Step 4: Install Dependencies

```bash
npm install --legacy-peer-deps
```

### Step 5: Build and Deploy

```bash
# Build application
npm run build

# Deploy to Azure App Service
az webapp deployment source config-zip \
  --resource-group ce-devtracker-labs-rg \
  --name ce-devtracker-labs-app \
  --src dist.zip
```

## Known Issues & Workarounds

### React 19 Compatibility
- MSAL React has peer dependency on React 16-18
- Workaround: Install with `--legacy-peer-deps`
- Functionality: Working correctly despite peer dependency warning

### Cosmos DB Partition Keys
- Users: `/uid` (Entra ID homeAccountId)
- Invites: `/email` (lowercase normalized)
- Notifications: `/userId`
- Notes: `/unitId` (for change feed efficiency)
- Audit Logs: `/userId` (optimized for user queries)

## Testing

```bash
# Run unit tests
npm run test:run

# Run with coverage
npm run test:coverage

# Lint code
npm run lint
```

## Cost Estimates (LABS Environment)

| Resource | Tier | Est. Monthly Cost |
|----------|------|-------------------|
| App Service B1 | Basic | $13 |
| Cosmos DB | Serverless | $5-25 |
| Storage Account | Standard LRS | $0.50 |
| Key Vault | Standard | $0.03 |
| **Total** | | **$20-45/month** |

## Migration Checklist

### Code Migration
- [x] Bicep infrastructure templates
- [x] Azure SDK packages installed
- [x] MSAL authentication configured
- [x] AzureAuthContext created
- [x] Graph API email service
- [x] Blob Storage service
- [ ] Login component updated
- [ ] CompleteSignup component updated
- [ ] userService.ts migrated to Cosmos DB
- [ ] notesService.ts with change feed
- [ ] auditLogService.ts with continuation tokens
- [ ] companyService.ts migrated
- [ ] incentiveService.ts migrated
- [ ] LogoUploadModal updated for Blob Storage
- [ ] GitHub Actions workflow created

### Data Migration
- [ ] Export Firestore users collection
- [ ] Export Firestore invites collection
- [ ] Export Firestore audit logs
- [ ] Migrate to Cosmos DB
- [ ] Migrate Firebase Storage blobs to Azure Blob Storage

### Testing
- [ ] Authentication flows (login, logout, signup)
- [ ] User management (invite, activate, deactivate)
- [ ] CRUD operations on all entities
- [ ] Real-time notes updates
- [ ] File uploads
- [ ] Email sending
- [ ] Reports generation
- [ ] Role-based access control

## Rollback Plan

1. Keep Firebase project active for 30 days
2. Maintain backups of all Cosmos DB data
3. DNS can be reverted to Firebase Hosting if issues arise
4. Switch back to `master` branch and redeploy

## Support

For issues or questions about this migration:
1. Check this README
2. Review the plan file at `C:\Users\jamie.mckenzie\.claude\plans\happy-inventing-kahan.md`
3. Check Azure documentation
4. Review commit history for changes

## Next Steps

1. Complete Login and CompleteSignup component updates
2. Migrate all service files to Cosmos DB
3. Update LogoUploadModal for Azure Blob Storage
4. Create GitHub Actions CI/CD workflow
5. Test all functionality end-to-end
6. Deploy to LABS environment
7. Validate and document findings
8. Plan PROD environment deployment (future scope)
