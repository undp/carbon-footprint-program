targetScope = 'resourceGroup'

@description('Azure Container Registry name (must be globally unique, lowercase, alphanumeric)')
param acrName string

@description('Container Registry SKU tier')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param acrSku string = 'Basic'

@description('Tags to apply to the ACR')
param tags object = {}

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

