targetScope = 'resourceGroup'

@description('Base name prefix for ACR (optional, will be combined with uniqueString)')
param acrNamePrefix string = 'acr'

@description('Container Registry SKU tier')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param acrSku string = 'Basic'

@description('Tags to apply to the ACR')
param tags object = {}

// Generate globally unique ACR name (3-50 alphanumeric chars, must start with letter)
// Format: <prefix><uniqueString> (e.g., acrhash123abc)
var acrName = '${acrNamePrefix}${uniqueString(resourceGroup().id)}'

resource acr 'Microsoft.ContainerRegistry/registries@2025-11-01' = {
  name: acrName
  location: resourceGroup().location
  sku: {
    name: acrSku
  }
  properties: {
    adminUserEnabled: false
  }
  tags: tags
}

output id string = acr.id
output loginServer string = acr.properties.loginServer
output name string = acr.name
output sku string = acrSku

