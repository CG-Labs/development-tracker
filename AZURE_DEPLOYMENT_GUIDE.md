# Azure Deployment Guide - DevTracker LABS Environment

## Overview

This guide provides step-by-step instructions for deploying the DevTracker application to Azure infrastructure (LABS environment).

**Target Environment:** `ce-devtracker-labs-*`
**Subscription:** ce-labs-sub
**Region:** East US

## Prerequisites

Before starting, ensure you have:

- [ ] Azure CLI installed (`az --version`)
- [ ] Contributor access to ce-labs-sub subscription
- [ ] Node.js 20+ installed
- [ ] Git repository cloned with `feature/azure-migration` branch checked out
- [ ] Access to Microsoft 365 tenant for Graph API

## Step-by-Step Deployment

### Phase 1: Deploy Azure Infrastructure

#### 1.1 Login and Set Subscription

```bash
# Login to Azure
az login

# Set subscription context
az account set --subscription "ce-labs-sub"

# Verify correct subscription
az account show --query "{Name:name, ID:id}"
```

#### 1.2: Create Entra ID App Registration

```bash
# Create app registration
APP_REG=$(az ad app create \
  --display-name "ce-devtracker-labs-reg" \
  --sign-in-audience "AzureADMyOrg" \
  --web-redirect-uris "https://ce-devtracker-labs-app.azurewebsites.net/auth/callback" "http://localhost:5173/auth/callback" \
  --query appId -o tsv)

echo "App Registration Client ID: $APP_REG"

# Create client secret
CLIENT_SECRET=$(az ad app credential reset --id $APP_REG --append --query password -o tsv)
echo "Client Secret (save this - it won't be shown again): $CLIENT_SECRET"

# Get tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "Tenant ID: $TENANT_ID"
```

#### 1.3: Configure API Permissions

```bash
# Add Microsoft Graph API permissions
# User.Read (Delegated) - e1fe6dd8-ba31-4d61-89e7-88639da4683d
az ad app permission add --id $APP_REG --api 00000003-0000-0000-c000-000000000000 --api-permissions e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope

# Mail.Send (Application) - b633e1c5-b582-4048-a93e-9f11b44c7e96
az ad app permission add --id $APP_REG --api 00000003-0000-0000-c000-000000000000 --api-permissions b633e1c5-b582-4048-a93e-9f11b44c7e96=Role

# User.ReadWrite.All (Application) - 19dbc75e-c2e2-444c-a770-ec69d8559fc7
az ad app permission add --id $APP_REG --api 00000003-0000-0000-c000-000000000000 --api-permissions 19dbc75e-c2e2-444c-a770-ec69d8559fc7=Role

# Directory.ReadWrite.All (Application) - 19dbc75e-c2e2-444c-a770-ec69d8559fc7
az ad app permission add --id $APP_REG --api 00000003-0000-0000-c000-000000000000 --api-permissions 19dbc75e-c2e2-444c-a770-ec69d8559fc7=Role

# Grant admin consent (requires Global Admin or Privileged Role Admin)
az ad app permission admin-consent --id $APP_REG
```

#### 1.4: Deploy Infrastructure with Bicep

```bash
cd infrastructure

# Deploy all resources
az deployment sub create \
  --name ce-devtracker-labs-$(date +%Y%m%d) \
  --location eastus \
  --template-file main.bicep \
  --parameters environment=labs \
               orgPrefix=ce \
               workload=devtracker \
               adminEmails="admin@yourcompany.com,admin2@yourcompany.com" \
               aadClientId="$APP_REG" \
               aadTenantId="$TENANT_ID" \
               aadClientSecret="$CLIENT_SECRET"
```

**Wait for deployment to complete (5-10 minutes)**

#### 1.5: Verify Deployment

```bash
# Check resource group
az group show --name ce-devtracker-labs-rg

# List resources
az resource list --resource-group ce-devtracker-labs-rg --output table

# Verify Cosmos DB
az cosmosdb show --name ce-devtracker-labs-cosmos --resource-group ce-devtracker-labs-rg

# Verify App Service
az webapp show --name ce-devtracker-labs-app --resource-group ce-devtracker-labs-rg

# Test Key Vault access
az keyvault secret list --vault-name ce-devtracker-labs-kv
```

### Phase 2: Configure Local Development

#### 2.1: Create Local Environment File

```bash
# Copy example
cp .env.azure.example .env

# Get Cosmos DB connection details
COSMOS_ENDPOINT=$(az cosmosdb show \
  --name ce-devtracker-labs-cosmos \
  --resource-group ce-devtracker-labs-rg \
  --query documentEndpoint -o tsv)

COSMOS_KEY=$(az cosmosdb keys list \
  --name ce-devtracker-labs-cosmos \
  --resource-group ce-devtracker-labs-rg \
  --query primaryMasterKey -o tsv)

# Get Storage connection string
STORAGE_CONN=$(az storage account show-connection-string \
  --name cedevtrackerlabsst \
  --resource-group ce-devtracker-labs-rg \
  --query connectionString -o tsv)

echo "Update .env with these values:"
echo "VITE_AAD_CLIENT_ID=$APP_REG"
echo "VITE_AAD_TENANT_ID=$TENANT_ID"
echo "COSMOS_DB_ENDPOINT=$COSMOS_ENDPOINT"
echo "COSMOS_DB_KEY=$COSMOS_KEY"
echo "STORAGE_CONNECTION_STRING=$STORAGE_CONN"
```

#### 2.2: Edit .env File

```bash
# VITE_ variables (browser-accessible)
VITE_AAD_CLIENT_ID=<from-above>
VITE_AAD_TENANT_ID=<from-above>
VITE_AAD_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_APP_URL=http://localhost:5173

# Server-side variables
COSMOS_DB_ENDPOINT=<from-above>
COSMOS_DB_KEY=<from-above>
STORAGE_CONNECTION_STRING=<from-above>
STORAGE_CONTAINER_NAME=company-logos
ADMIN_EMAILS=admin@yourcompany.com
```

#### 2.3: Install Dependencies and Test Locally

```bash
# Install packages
npm install --legacy-peer-deps

# Run tests
npm run test:run

# Start dev server
npm run dev
```

Visit `http://localhost:5173` - you should see the Azure AD login button

### Phase 3: Migrate Data from Firebase to Cosmos DB

#### 3.1: Export Firebase Data

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Select project
firebase use development-tracker-13764

# Export Firestore data
firebase firestore:export gs://development-tracker-13764.appspot.com/firestore-export-$(date +%Y%m%d)
```

#### 3.2: Download and Migrate Data

```bash
# Download export (this requires gsutil)
gsutil -m cp -r gs://development-tracker-13764.appspot.com/firestore-export-* ./firebase-export/

# Run migration script (to be created in Phase 3)
node scripts/migrate-firestore-to-cosmos.js
```

### Phase 4: Deploy Application to App Service

#### 4.1: Build Application

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run tests
npm run test:run

# Build production bundle
npm run build
```

#### 4.2: Deploy to Azure App Service

**Option A: Zip Deploy**

```bash
# Create zip of dist folder
cd dist
zip -r ../dist.zip .
cd ..

# Deploy zip
az webapp deployment source config-zip \
  --resource-group ce-devtracker-labs-rg \
  --name ce-devtracker-labs-app \
  --src dist.zip
```

**Option B: GitHub Actions (Recommended)**

See Phase 5 - GitHub Actions setup below

#### 4.3: Configure App Service Environment Variables

```bash
# Update app settings with production values
az webapp config appsettings set \
  --resource-group ce-devtracker-labs-rg \
  --name ce-devtracker-labs-app \
  --settings \
    VITE_AAD_CLIENT_ID="$APP_REG" \
    VITE_AAD_TENANT_ID="$TENANT_ID" \
    VITE_AAD_REDIRECT_URI="https://ce-devtracker-labs-app.azurewebsites.net/auth/callback" \
    VITE_APP_URL="https://ce-devtracker-labs-app.azurewebsites.net"
```

### Phase 5: Setup CI/CD with GitHub Actions

#### 5.1: Create Service Principal

```bash
# Create service principal for GitHub Actions
SP_OUTPUT=$(az ad sp create-for-rbac \
  --name "ce-devtracker-labs-sp" \
  --role contributor \
  --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/ce-devtracker-labs-rg \
  --sdk-auth)

echo "GitHub Secret AZURE_CREDENTIALS:"
echo "$SP_OUTPUT"
```

#### 5.2: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

```
AZURE_CREDENTIALS=<SP_OUTPUT from above>
AAD_CLIENT_ID=<App Registration Client ID>
AAD_TENANT_ID=<Tenant ID>
AAD_CLIENT_SECRET=<Client Secret>
ADMIN_EMAILS=admin@yourcompany.com,admin2@yourcompany.com
COSMOS_CONNECTION_STRING=<From Azure Portal or CLI>
```

#### 5.3: Enable GitHub Actions

Push the `feature/azure-migration` branch and create a PR. The workflow will:
- Run tests on PR
- Deploy to LABS on merge to master

### Phase 6: Testing

#### 6.1: Test Authentication

1. Visit https://ce-devtracker-labs-app.azurewebsites.net
2. Click "Sign in with Microsoft"
3. Authenticate with admin email (should auto-create profile)
4. Verify role-based permissions work

#### 6.2: Test User Invitations

1. Navigate to User Management
2. Invite a new user with Editor role
3. Check email received via Graph API
4. Accept invitation (creates guest user in Entra ID)
5. Verify user can login and has correct permissions

#### 6.3: Test Data Operations

- [ ] Create/edit developments
- [ ] Create/edit units
- [ ] Add notes (verify real-time updates via change feed)
- [ ] Upload company logo
- [ ] Generate reports (PDF export)
- [ ] Import/export Excel
- [ ] View audit logs

### Phase 7: Monitoring and Validation

#### 7.1: Set Up Monitoring

```bash
# Create budget alert
az consumption budget create \
  --budget-name ce-devtracker-labs-budget \
  --amount 50 \
  --time-grain Monthly \
  --resource-group ce-devtracker-labs-rg \
  --notifications threshold=80 \
  --contact-emails admin@yourcompany.com
```

#### 7.2: Monitor Application

```bash
# View App Service logs
az webapp log tail --name ce-devtracker-labs-app --resource-group ce-devtracker-labs-rg

# Check Cosmos DB metrics
az cosmosdb show --name ce-devtracker-labs-cosmos --resource-group ce-devtracker-labs-rg --query "{id:id, location:location, provisioningState:provisioningState}"
```

#### 7.3: Verify All Features

Use the testing checklist in `AZURE_MIGRATION_README.md`

## Troubleshooting

### Issue: App Service not starting

```bash
# Check logs
az webapp log tail --name ce-devtracker-labs-app --resource-group ce-devtracker-labs-rg

# Restart app
az webapp restart --name ce-devtracker-labs-app --resource-group ce-devtracker-labs-rg
```

### Issue: Key Vault access denied

```bash
# Verify Managed Identity has access
az role assignment list \
  --scope /subscriptions/$(az account show --query id -o tsv)/resourceGroups/ce-devtracker-labs-rg/providers/Microsoft.KeyVault/vaults/ce-devtracker-labs-kv

# Grant access manually if needed
APP_MI=$(az webapp identity show --name ce-devtracker-labs-app --resource-group ce-devtracker-labs-rg --query principalId -o tsv)

az role assignment create \
  --assignee $APP_MI \
  --role "Key Vault Secrets User" \
  --scope /subscriptions/$(az account show --query id -o tsv)/resourceGroups/ce-devtracker-labs-rg/providers/Microsoft.KeyVault/vaults/ce-devtracker-labs-kv
```

### Issue: Cosmos DB connection errors

```bash
# Verify endpoint and key
az cosmosdb show --name ce-devtracker-labs-cosmos --resource-group ce-devtracker-labs-rg --query documentEndpoint

# Regenerate keys if needed
az cosmosdb keys regenerate --name ce-devtracker-labs-cosmos --resource-group ce-devtracker-labs-rg --key-kind primary
```

### Issue: Email not sending

- Verify Graph API permissions have admin consent
- Check app service logs for Graph API errors
- Ensure service account has Mail.Send application permission
- Test Graph API access with Azure Portal

## Post-Deployment Validation

### Checklist

- [ ] App Service URL is accessible
- [ ] Azure AD login redirects correctly
- [ ] Admin can login and gets admin role
- [ ] Cosmos DB containers visible and accessible
- [ ] Blob Storage container exists
- [ ] Key Vault secrets readable by app
- [ ] Graph API can send emails
- [ ] All environment variables set correctly
- [ ] Logs showing no errors
- [ ] Budget alerts configured

### Health Check Commands

```bash
# App Service status
az webapp show --name ce-devtracker-labs-app --resource-group ce-devtracker-labs-rg --query state

# Cosmos DB status
az cosmosdb show --name ce-devtracker-labs-cosmos --resource-group ce-devtracker-labs-rg --query provisioningState

# Storage Account status
az storage account show --name cedevtrackerlabsst --resource-group ce-devtracker-labs-rg --query provisioningState

# Key Vault status
az keyvault show --name ce-devtracker-labs-kv --query properties.provisioningState
```

## Rollback Procedure

If issues arise:

1. Keep Firebase environment running
2. DNS/routing can revert to Firebase Hosting
3. Delete Azure resources:

```bash
# Delete entire resource group (WARNING: Irreversible)
az group delete --name ce-devtracker-labs-rg --yes --no-wait
```

4. Checkout master branch and redeploy to Firebase:

```bash
git checkout master
npm run build
firebase deploy
```

## Next Steps After LABS Validation

1. Monitor LABS for 1-2 weeks
2. Collect user feedback
3. Performance tune Cosmos DB queries
4. Optimize costs (review RU consumption)
5. Plan PROD environment deployment
6. Decommission Firebase (after PROD is stable)

## Support and Resources

- **Azure Portal**: https://portal.azure.com
- **Entra ID Portal**: https://entra.microsoft.com
- **Cosmos DB Data Explorer**: Portal → ce-devtracker-labs-cosmos → Data Explorer
- **App Service Logs**: Portal → ce-devtracker-labs-app → Log stream
- **Migration Plan**: `C:\Users\jamie.mckenzie\.claude\plans\happy-inventing-kahan.md`
- **Azure Naming Convention**: `C:\Users\jamie.mckenzie\.claude\skills\azure-naming-convention.md`
