targetScope = 'resourceGroup'

@description('ACR name (must exist in this resource group)')
param acrName string

@description('Principal ID to grant AcrPull')
param principalId string

@description('App Service name (used to generate deterministic role assignment name)')
param appServiceName string

// Existing Container Registry in this resource group
resource sharedAcr 'Microsoft.ContainerRegistry/registries@2025-11-01' existing = {
  name: acrName
}

// AcrPull role assignment
// Role definition ID for AcrPull: 7f951dda-4ed3-4680-a7ca-43fe172d538d
resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(sharedAcr.id, appServiceName, 'acr-pull')
  scope: sharedAcr
  properties: {
    roleDefinitionId: '/providers/Microsoft.Authorization/roleDefinitions/7f951dda-4ed3-4680-a7ca-43fe172d538d'
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

