@description('Location for the App Service')
param location string = resourceGroup().location

@description('SKU name for App Service Plan (e.g., F1, B1, S1)')
param skuName string = 'F1'

@description('Database password')
@secure()
param databasePassword string

@description('Database host')
param databaseHost string

@description('Database name')
param databaseName string

@description('Database user')
param databaseUser string

@description('Allowed origin for CORS (Static Web App hostname)')
param allowedOrigin string

@description('Node.js version (e.g., 24-lts)')
param nodeVersion string = '~24'

@description('Use Key Vault references for secrets (true) or direct env vars (false)')
param useKeyVaultForSecrets bool = false

@description('Key Vault URI for secret references (only used if useKeyVaultForSecrets is true)')
param keyVaultUri string = ''

@description('Key Vault secret name for DATABASE_URL (only used if useKeyVaultForSecrets is true)')
param databaseUrlSecretName string = 'database-url'

@description('Tags to apply to resources')
param tags object = {}

// Generate unique App Service Plan name
var appServicePlanName = 'asp-${uniqueString(resourceGroup().id)}'

// Generate unique App Service name
var appServiceName = 'api-${uniqueString(resourceGroup().id)}'

// Determine SKU tier based on SKU name
var skuTier = skuName == 'F1' ? 'Free' : (skuName == 'D1' ? 'Shared' : 'Basic')

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2024-02-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  properties: {
    reserved: true // Required for Linux
  }
  sku: {
    name: skuName
    tier: skuTier
  }
  tags: tags
}

// App Service
resource appService 'Microsoft.Web/sites@2024-02-01' = {
  name: appServiceName
  location: location
  tags: tags
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|${nodeVersion}'
      appSettings: [
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'PORT'
          value: '8080'
        }
        {
          name: 'WEBSITES_PORT'
          value: '8080'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
        {
          name: 'ALLOWED_ORIGIN'
          value: allowedOrigin
        }
        {
          name: 'DATABASE_URL'
          value: useKeyVaultForSecrets 
            ? '@Microsoft.KeyVault(SecretUri=${keyVaultUri}/secrets/${databaseUrlSecretName}/)'
            : 'postgresql://${databaseUser}:${databasePassword}@${databaseHost}:5432/${databaseName}?sslmode=require'
        }
      ]
      alwaysOn: skuName != 'F1' // Free tier doesn't support Always On
      http20Enabled: true
      minTlsVersion: '1.2'
    }
    httpsOnly: true
  }
  identity: {
    type: 'SystemAssigned'
  }
}

// Outputs
@description('App Service resource ID')
output id string = appService.id

@description('App Service name')
output name string = appService.name

@description('Default hostname of the App Service')
output defaultHostname string = appService.properties.defaultHostname

@description('App Service Plan name')
output planName string = appServicePlan.name

@description('Principal ID of the system-assigned identity')
output principalId string = appService.identity.principalId

