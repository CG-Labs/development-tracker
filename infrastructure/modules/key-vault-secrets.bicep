param keyVaultName string
param cosmosConnectionString string
param storageConnectionString string
param aadClientId string
param aadClientSecret string
param aadTenantId string
param adminEmails string

resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' existing = {
  name: keyVaultName
}

resource kvCosmosSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'cosmos-db-connection-string'
  properties: {
    value: cosmosConnectionString
  }
}

resource kvStorageSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'storage-connection-string'
  properties: {
    value: storageConnectionString
  }
}

resource kvAadClientId 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'aad-client-id'
  properties: {
    value: aadClientId
  }
}

resource kvAadClientSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'aad-client-secret'
  properties: {
    value: aadClientSecret
  }
}

resource kvAadTenantId 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'aad-tenant-id'
  properties: {
    value: aadTenantId
  }
}

resource kvAdminEmails 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'admin-emails'
  properties: {
    value: adminEmails
  }
}
