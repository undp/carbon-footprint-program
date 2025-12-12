// Plantilla para el stack compartido (actualmente solo ACR)
// Diseñada para que en el futuro se puedan agregar más recursos
// compartidos sin modificar el stack principal.
// Se usa para crear el stack compartido en undp-huella-latam-shared-rg.

@description('Azure Container Registry name (must be globally unique)')
param acrName string

@description('Container Registry SKU tier')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param acrSku string = 'Basic'

@description('Environment name for tagging')
param environment string = 'shared'

@description('Tags to apply to all resources')
param tags object = {
  Environment: environment
  Project: 'undp-huella-latam'
  ManagedBy: 'Bicep'
}

// --------- Container Registry ---------
module sharedAcr 'modules/acr.bicep' = {
  name: 'sharedAcrDeployment'
  params: {
    acrName: acrName
    acrSku: acrSku
    tags: tags
  }
}

// Outputs (mismos nombres que main.bicep para compatibilidad)
@description('Container Registry login server')
output acrLoginServer string = sharedAcr.outputs.loginServer

@description('Container Registry resource ID')
output containerRegistryId string = sharedAcr.outputs.id

@description('Container Registry name')
output containerRegistryName string = sharedAcr.outputs.name

// Output estructurado para compatibilidad con main.bicep
@description('Infrastructure resource names')
output infrastructure object = {
  containerRegistry: {
    id: sharedAcr.outputs.id
    loginServer: sharedAcr.outputs.loginServer
    name: sharedAcr.outputs.name
    sku: sharedAcr.outputs.sku
  }
}


