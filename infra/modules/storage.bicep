param skuName string
param location string

resource storage 'Microsoft.Storage/storageAccounts@2025-06-01' = {
  name: uniqueString(resourceGroup().id)
  location: location
  sku: {
    name: skuName
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
  }
}
output name string = storage.name
output id string = storage.id
output blobUri string = storage.properties.primaryEndpoints.blob
output filebUri string = storage.properties.primaryEndpoints.file
output primaryEndpoints object = storage.properties.primaryEndpoints
