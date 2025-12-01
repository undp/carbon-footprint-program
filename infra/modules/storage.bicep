param skuName string
param location string

@description('Network ACL default action: Allow or Deny')
param networkAclDefaultAction string = 'Deny'

@description('Services to bypass for network ACLs')
param networkAclBypass string = 'AzureServices'

@description('Tags to apply to the Storage Account')
param tags object = {}

// Generate unique storage account name (must be globally unique, 3-24 lowercase alphanumeric)
// Note: Storage account names cannot contain hyphens or uppercase letters
var storageAccountName = 'st${uniqueString(resourceGroup().id)}'

resource storage 'Microsoft.Storage/storageAccounts@2025-06-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: skuName
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    networkAcls: {
      bypass: networkAclBypass
      defaultAction: networkAclDefaultAction
    }
  }
  tags: tags
}
output name string = storage.name
output id string = storage.id
output blobUri string = storage.properties.primaryEndpoints.blob
output fileUri string = storage.properties.primaryEndpoints.file
output primaryEndpoints object = storage.properties.primaryEndpoints
