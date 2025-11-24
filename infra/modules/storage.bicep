param skuName string
param location string

@description('Network ACL default action: Allow or Deny')
param networkAclDefaultAction string = 'Deny'

@description('Services to bypass for network ACLs')
param networkAclBypass string = 'AzureServices'

resource storage 'Microsoft.Storage/storageAccounts@2025-06-01' = {
  name: uniqueString(resourceGroup().id)
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
}
output name string = storage.name
output id string = storage.id
output blobUri string = storage.properties.primaryEndpoints.blob
output filebUri string = storage.properties.primaryEndpoints.file
output primaryEndpoints object = storage.properties.primaryEndpoints
