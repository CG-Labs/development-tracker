targetScope = 'subscription'

@description('Environment name (labs, prod)')
param environment string

@description('Organization prefix (ce)')
param orgPrefix string = 'ce'

@description('Workload name (devtracker)')
param workload string = 'devtracker'

@description('Azure region')
param location string = 'eastus'

@description('Admin emails (comma-separated)')
@secure()
param adminEmails string

@description('Azure AD App Registration Client ID')
param aadClientId string

@description('Azure AD Tenant ID')
param aadTenantId string

@description('Azure AD App Registration Client Secret')
@secure()
param aadClientSecret string

// Resource names following convention: {orgPrefix}-{workload}-{environment}-{resourceType}
var resourceGroupName = '${orgPrefix}-${workload}-${environment}-rg'
var appServicePlanName = '${orgPrefix}-${workload}-${environment}-plan'
var appServiceName = '${orgPrefix}-${workload}-${environment}-app'
var cosmosAccountName = '${orgPrefix}-${workload}-${environment}-cosmos'
var storageAccountName = '${orgPrefix}${workload}${environment}st' // No hyphens for storage
var keyVaultName = '${orgPrefix}-${workload}-${environment}-kv'

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: resourceGroupName
  location: location
  tags: {
    Environment: environment
    Application: workload
    ManagedBy: 'Bicep'
    Organization: orgPrefix
  }
}

// Key Vault (deploy first so other resources can reference it)
module keyVault 'modules/key-vault.bicep' = {
  scope: rg
  name: 'keyvault-deployment'
  params: {
    keyVaultName: keyVaultName
    location: location
    tenantId: subscription().tenantId
  }
}

// Cosmos DB
module cosmosDb 'modules/cosmos-db.bicep' = {
  scope: rg
  name: 'cosmosdb-deployment'
  params: {
    accountName: cosmosAccountName
    location: location
  }
}

// Storage Account
module storage 'modules/storage.bicep' = {
  scope: rg
  name: 'storage-deployment'
  params: {
    storageAccountName: storageAccountName
    location: location
  }
}

// App Service
module appService 'modules/app-service.bicep' = {
  scope: rg
  name: 'appservice-deployment'
  params: {
    planName: appServicePlanName
    appName: appServiceName
    location: location
    keyVaultName: keyVault.outputs.keyVaultName
  }
}

// Store secrets in Key Vault
resource kvCosmosSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  name: '${keyVault.outputs.keyVaultName}/cosmos-db-connection-string'
  properties: {
    value: cosmosDb.outputs.connectionString
  }
  scope: rg
}

resource kvStorageSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  name: '${keyVault.outputs.keyVaultName}/storage-connection-string'
  properties: {
    value: storage.outputs.connectionString
  }
  scope: rg
}

resource kvAadClientId 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  name: '${keyVault.outputs.keyVaultName}/aad-client-id'
  properties: {
    value: aadClientId
  }
  scope: rg
}

resource kvAadClientSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  name: '${keyVault.outputs.keyVaultName}/aad-client-secret'
  properties: {
    value: aadClientSecret
  }
  scope: rg
}

resource kvAadTenantId 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  name: '${keyVault.outputs.keyVaultName}/aad-tenant-id'
  properties: {
    value: aadTenantId
  }
  scope: rg
}

resource kvAdminEmails 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  name: '${keyVault.outputs.keyVaultName}/admin-emails'
  properties: {
    value: adminEmails
  }
  scope: rg
}

// Grant Key Vault access to App Service Managed Identity
module kvAccess 'modules/key-vault-access.bicep' = {
  scope: rg
  name: 'keyvault-access-deployment'
  params: {
    keyVaultName: keyVault.outputs.keyVaultName
    appServicePrincipalId: appService.outputs.systemAssignedIdentityPrincipalId
  }
  dependsOn: [
    keyVault
    appService
  ]
}

// Outputs
output resourceGroupName string = resourceGroupName
output appServiceUrl string = appService.outputs.appUrl
output cosmosDbEndpoint string = cosmosDb.outputs.endpoint
output storageAccountName string = storage.outputs.storageAccountName
output keyVaultName string = keyVault.outputs.keyVaultName
