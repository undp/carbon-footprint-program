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

@description('Node.js version (e.g., node|24-lts)')
param linuxFxVersion string = 'node|24-lts'

@description('Allowed origin for API CORS (e.g., https://app.example.com)')
param allowedOrigin string

@description('Enable managed identity credentials for container registry')
param useAcrManagedIdentity bool = false

@description('Azure Storage Account name for blob storage (file uploads)')
param storageAccountName string = ''

@description('Enable Azure Entra ID authentication')
param enableAzureAuth bool = false

@description('Azure Entra ID Tenant ID (GUID)')
param azureAuthTenantId string = ''

@description('Azure Frontend App Client ID')
param azureAuthClientId string = ''

@description('Azure tenant type: "external" (CIAM) or "organizational"')
param azureAuthTenantType string = 'external'

@description('Azure tenant subdomain (required for external/CIAM tenants)')
param azureAuthTenantSubdomain string = ''

@description('Tags to apply to resources')
param tags object = {}

// Generate unique App Service Plan name
var appServicePlanName = 'asp-${uniqueString(resourceGroup().id)}'

// Generate unique App Service name
var appServiceName = 'api-${uniqueString(resourceGroup().id)}'

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2025-03-01' = {
  name: appServicePlanName
  location: location
  properties: {
    reserved: true // Required for Linux
  }
  sku: {
    name: skuName

  }
  kind: 'linux'
  tags: tags
}

// App Service
resource appService 'Microsoft.Web/sites@2025-03-01' = {
  name: appServiceName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      acrUseManagedIdentityCreds: useAcrManagedIdentity
      cors: {
        allowedOrigins: [
          allowedOrigin
          
        ]
        supportCredentials: true
        }
      appSettings: concat([
        {
          name: 'API_PORT'
          value: '8080'
        }
        {
          name: 'WEBSITES_PORT'
          value: '8080'
        }
        {
          name: 'LOG_LEVEL'
          value: 'info'
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
          value: 'postgresql://${databaseUser}:${databasePassword}@${databaseHost}:5432/${databaseName}?sslmode=require'
        }
      ], storageAccountName != '' ? [
        {
          name: 'STORAGE_PROVIDER'
          value: 'azure_blob_storage'
        }
        {
          name: 'AZURE_STORAGE_ACCOUNT_NAME'
          value: storageAccountName
        }
        {
          name: 'AZURE_STORAGE_CONTAINER_NAME'
          value: 'files'
        }
      ] : [], enableAzureAuth ? [
        {
          name: 'AZURE_TENANT_ID'
          value: azureAuthTenantId
        }
        {
          name: 'AZURE_API_CLIENT_ID'
          value: azureAuthClientId
        }
        {
          name: 'AZURE_TENANT_TYPE'
          value: azureAuthTenantType
        }
        {
          name: 'AZURE_TENANT_SUBDOMAIN'
          value: azureAuthTenantSubdomain
        }
        {
          // The API validates Entra access tokens directly via JWKS (issuer/
          // audience derived from the AZURE_* settings above). No App Service
          // Easy Auth gateway is used — keep platform Authentication disabled.
          name: 'AUTH_PROVIDER'
          value: 'jwks'
        }
      ] : [])
    }
  }
}

// Outputs
@description('App Service resource ID')
output id string = appService.id

@description('App Service name')
output name string = appService.name

@description('Default hostname of the App Service')
output defaultHostname string = appService.properties.defaultHostName

@description('App Service Plan name')
output planName string = appServicePlan.name

@description('App Service managed identity principal ID')
output principalId string = appService.identity.principalId
