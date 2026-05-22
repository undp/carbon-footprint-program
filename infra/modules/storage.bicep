param skuName string
param location string

@description('Network ACL default action: Allow or Deny')
param networkAclDefaultAction string = 'Deny'

@description('Services to bypass for network ACLs')
param networkAclBypass string = 'AzureServices'

@description('Allowed origin for blob storage CORS (e.g., https://app.example.com). Leave empty to disable CORS.')
param allowedOrigin string = ''

@description('Additional allowed origin for local development (e.g., http://localhost:5173). Leave empty to disable.')
param devAllowedOrigin string = ''

@description('Maximum allowed upload size in bytes. This is the same value seeded into the FILE_UPLOAD_MAX_BYTES system parameter, surfaced here so future infra-level enforcement (eg. Event Grid orphan cleanup) can reuse the configured ceiling without drifting from the application config.')
@minValue(1)
@maxValue(1073741824)
param fileUploadMaxBytes int = 20971520

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

// Blob service (required parent for containers)
// CORS is configured to allow the frontend to interact directly with blob storage via SAS URLs
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2025-06-01' = {
  parent: storage
  name: 'default'
  properties: {
    cors: {
      corsRules: allowedOrigin != '' ? [
        {
          allowedOrigins: devAllowedOrigin != '' ? [ allowedOrigin, devAllowedOrigin ] : [ allowedOrigin ]
          allowedMethods: [ 'GET' , 'PUT', 'HEAD', 'OPTIONS' ]
          allowedHeaders: [ '*' ]
          exposedHeaders: [ '*' ]
          maxAgeInSeconds: 3600
        }
      ] : []
    }
  }
}

// Container for uploaded files (organization docs, carbon inventory certifications, etc.)
resource filesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-06-01' = {
  parent: blobService
  name: 'files'
  properties: {
    publicAccess: 'None'
  }
}

output name string = storage.name
output id string = storage.id
output blobUri string = storage.properties.primaryEndpoints.blob
output fileUri string = storage.properties.primaryEndpoints.file
output primaryEndpoints object = storage.properties.primaryEndpoints
output fileUploadMaxBytes int = fileUploadMaxBytes
