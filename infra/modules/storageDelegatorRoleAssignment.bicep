targetScope = 'resourceGroup'

@description('Storage account name (must exist in this resource group)')
param storageAccountName string

@description('Principal ID to grant Storage Blob Delegator')
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

// Storage Blob Delegator role assignment
//
// This grants permission to call getUserDelegationKey() on the storage account,
// which is required to generate User Delegation SAS tokens. These tokens allow
// the frontend to interact directly with blob storage via temporary signed URLs,
// avoiding the need to proxy file data through the API server.
//
// Role: Storage Blob Delegator
// Built-in role ID: db58b8e5-c6ad-4a2a-8342-4190687cbf4a
// Docs: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/storage#storage-blob-delegator
//
// Permissions granted:
//   - Generate user delegation keys for creating SAS tokens
//   - Does NOT grant read/write access to blob data itself
//
resource storageBlobDelegator 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, principalId, 'storage-blob-delegator')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'db58b8e5-c6ad-4a2a-8342-4190687cbf4a')
    principalId: principalId
    principalType: principalType
  }
}
