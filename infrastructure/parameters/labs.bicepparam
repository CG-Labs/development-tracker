using '../main.bicep'

param environment = 'labs'
param orgPrefix = 'ce'
param workload = 'devtracker'
param location = 'uksouth'

// These will need to be provided at deployment time
param adminEmails = '' // Will be provided via command line
param aadClientId = '' // Will be provided after App Registration creation
param aadTenantId = '' // Will be provided after App Registration creation
param aadClientSecret = '' // Will be provided after App Registration creation
