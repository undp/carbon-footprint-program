param location string

param skuName string

@description('Object ID of the Azure AD group that needs access to Key Vault')
param devGroupObjectId string = ''

@secure()
@description('Database password to store as secret (if provided)')
param dbPassword string = ''

@description('Name for the database password secret')
param dbPasswordSecretName string = 'postgres-admin-password'

resource keyVault 'Microsoft.KeyVault/vaults@2025-05-01' = {
  name: uniqueString(resourceGroup().id)
  location: location
  properties: {
    tenantId: subscription().tenantId
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enabledForTemplateDeployment: true
    enableRbacAuthorization: true
    createMode: 'default'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
    sku: {
      name: skuName
      family: 'A'
    }
  }
}

// Create/update secret only if password is provided
// If password is empty, the secret is not touched (preserves existing secret)
resource dbPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2025-05-01' = if (dbPassword != '') {
  parent: keyVault
  name: dbPasswordSecretName
  properties: {
    value: dbPassword
  }
}

// Key Vault Secrets Officer role definition ID
var keyVaultSecretsOfficerRoleId = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'

// Assign Key Vault Secrets Officer role to the Azure AD group
resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (devGroupObjectId != '') {
  name: guid(keyVault.id, devGroupObjectId, keyVaultSecretsOfficerRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsOfficerRoleId)
    principalId: devGroupObjectId
    principalType: 'Group'
  }
}

output name string = keyVault.name
output id string = keyVault.id
output vaultUri string = keyVault.properties.vaultUri
output postgresSecretName string = dbPasswordSecret.name
