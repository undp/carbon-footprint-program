targetScope = 'resourceGroup'

@description('Storage account name (must exist in this resource group)')
param storageAccountName string

@description('Principal ID to grant Storage Blob Data Contributor')
param principalId string

@description('Principal type: ServicePrincipal for managed identities, Group for Azure AD groups')
@allowed([
  'ServicePrincipal'
  'Group'
])
param principalType string = 'ServicePrincipal'

// Existing Storage Account in this resource group
resource storageAccount 'Microsoft.Storage/storageAccounts@2025-06-01' existing = {
  name: storageAccountName
}

// Storage Blob Data Contributor role assignment
//
// This grants the App Service's managed identity permission to read, write, and delete
// blobs in the storage account. This is the recommended way to authenticate Azure services
// to each other — instead of storing connection strings or account keys (which are static
// secrets that can leak), the App Service proves its identity via Azure AD and Azure
// checks the RBAC role assignment to authorize the request. No secrets are involved.
//
// Role: Storage Blob Data Contributor
// Built-in role ID: ba92f5b4-2d11-453d-a403-e96b0029c9fe
// Docs: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/storage#storage-blob-data-contributor
//
// Permissions granted:
//   - Read, write, and delete blob containers and data
//   - Does NOT grant access to manage the storage account itself (keys, networking, etc.)
//
resource storageBlobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, principalId, 'storage-blob-data-contributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: principalId
    principalType: principalType
  }
}
