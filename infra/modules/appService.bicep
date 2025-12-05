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

@description('Tags to apply to resources')
param tags object = {}

// Generate unique App Service Plan name
var appServicePlanName = 'asp-${uniqueString(resourceGroup().id)}'

// Generate unique App Service name
var appServiceName = 'api-${uniqueString(resourceGroup().id)}'

var apiAllowedOrigins = frontDoorCustomDomain != '' ? frontDoorCustomDomain : 'https://${staticWebApp.outputs.defaultHostname}'

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
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: linuxFxVersion
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
          value: 'true'
        }
        {
          name: 'ALLOWED_ORIGIN'
          value: apiAllowedOrigins
        }
        {
          name: 'DATABASE_URL'
          value: 'postgresql://${databaseUser}:${databasePassword}@${databaseHost}:5432/${databaseName}?sslmode=require'
        }
      ]
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

