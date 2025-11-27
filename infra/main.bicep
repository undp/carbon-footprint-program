// --------- General parameters ---------
@description('Location for resources')
param location string = resourceGroup().location

@description('Key Vault SKU')
@allowed([
  'standard'
  'premium'
])
param keyVaultSkuName string

@description('Storage Account SKU')
@allowed([
  'Standard_LRS'
  'Standard_GRS'
  'Standard_RAGRS'
  'Standard_ZRS'
  'Premium_LRS'
  'Premium_ZRS'
])
param storageSkuName string

// --------- Database parameters ---------
@description('Database user')
param dbUser string

@description('Database name')
param dbName string

@description('Database SKU name')
param dbSkuName string

@description('Database SKU tier')
@allowed([
  'Burstable'
  'GeneralPurpose'
  'MemoryOptimized'
])
param dbSkuTier string

@description('Storage size in GB')
@minValue(32)
@maxValue(16384)
param dbStorageSizeGB int

@description('Backup retention in days')
@minValue(7)
@maxValue(35)
param dbBackupRetentionDays int

@description('Enable geo-redundant backup')
@allowed([
  'Enabled'
  'Disabled'
])
param dbGeoRedundantBackup string

@secure()
@description('Postgres admin password')
param dbPassword string

@description('Object ID of the Azure AD group for Key Vault access (optional)')
param devGroupObjectId string = ''

@description('Allowed IP ranges for PostgreSQL firewall')
param dbAllowedIpRanges array = []

@description('Availability zone for the Postgres server (1, 2, or 3). Set to empty string for regions without zones.')
param availabilityZone string = ''

@description('Developer name for resource naming')
param developerName string

// --------- Static Web App parameters ---------
@description('SKU tier for Azure Static Web Apps (Free or Standard)')
param staticWebAppSkuName string

@description('Repository URL for automatic CI/CD deployment (leave empty for manual deployment)')
param staticWebAppRepositoryUrl string = ''

@description('Git branch that triggers automatic deployment')
param staticWebAppBranch string = 'main'

@description('Enable preview environments for Pull Requests')
param staticWebAppStagingEnabled bool = true

@description('Allow Azure to update staticwebapp.config.json automatically')
param staticWebAppAllowConfigUpdates bool = true

@description('Git provider type (GitHub, GitLab, Bitbucket, or Custom for manual deployment)')
@allowed([
  'GitHub'
  'GitLab'
  'Bitbucket'
  'Custom'
])
param staticWebAppProvider string = 'GitHub'

@description('Enable enterprise-grade CDN built into Static Web App (requires Standard SKU)')
param staticWebAppEnterpriseCdn bool = false

@description('Application location relative to repository root')
param staticWebAppAppLocation string = '/apps/web'

@description('Build output location relative to app location')
param staticWebAppOutputLocation string = 'dist'

// --------- Front Door parameters ---------
@description('Enable Azure Front Door')
param enableFrontDoor bool = false

@description('SKU for Azure Front Door')
@allowed([
  'Standard_AzureFrontDoor'
  'Premium_AzureFrontDoor'
])
param frontDoorSkuName string

@description('Custom domain name for Front Door (optional)')
param frontDoorCustomDomain string = ''

@description('Enable WAF managed rules (requires Premium SKU, ignored for Standard)')
param frontDoorEnableManagedRules bool = false

@description('WAF protection mode: Prevention blocks threats, Detection only logs')
@allowed([
  'Prevention'
  'Detection'
])
param frontDoorWafMode string = 'Detection'

@description('Rate limit threshold (requests per minute per IP)')
@minValue(10)
@maxValue(10000)
param frontDoorRateLimitThreshold int = 100

@description('Tags to apply to all resources')
param tags object = {
  Environment: developerName
  Project: 'undp-huella-latam'
  ManagedBy: 'Bicep'
}

// --------- Key Vault ---------
// We can create up to 1 key vault per deployment
module keyVault 'modules/keyVault.bicep' = {
  name: 'keyVaultDeployment'
  params: {
    skuName: keyVaultSkuName
    location: location
    dbPassword: dbPassword
    devGroupObjectId: devGroupObjectId
    tags: tags
  }
}

// --------- Storage Account ---------
module storage 'modules/storage.bicep' = {
  name: 'storageDeployment'
  params: {
    skuName: storageSkuName
    location: location
    tags: tags
  }
}

// Reference to existing Key Vault to retrieve secrets
resource existingKeyVault 'Microsoft.KeyVault/vaults@2025-05-01' existing = {
  name: keyVault.outputs.name
}

// --------- Postgres ---------
module postgres 'modules/postgres.bicep' = {
  name: 'postgresDeployment'
  dependsOn: [
    #disable-next-line no-unnecessary-dependson
    keyVault
  ]
  params: {
    location: location
    user: dbUser
    password: existingKeyVault.getSecret(keyVault.outputs.postgresSecretName)
    dbName: dbName
    skuName: dbSkuName
    skuTier: dbSkuTier
    storageSizeGB: dbStorageSizeGB
    backupRetentionDays: dbBackupRetentionDays
    geoRedundantBackup: dbGeoRedundantBackup
    allowedIpRanges: dbAllowedIpRanges
    tags: tags
    availabilityZone: availabilityZone
  }
}

// --------- Static Web App ---------
module staticWebApp 'modules/staticWebApp.bicep' = {
  name: 'staticWebAppDeployment'
  params: {
    location: location
    skuName: staticWebAppSkuName
    repositoryUrl: staticWebAppRepositoryUrl
    branch: staticWebAppBranch
    stagingEnabled: staticWebAppStagingEnabled
    allowConfigUpdates: staticWebAppAllowConfigUpdates
    provider: staticWebAppProvider
    enterpriseCdn: staticWebAppEnterpriseCdn
    appLocation: staticWebAppAppLocation
    outputLocation: staticWebAppOutputLocation
    tags: tags
  }
}

// --------- Azure Front Door ---------
module frontDoor 'modules/frontDoor.bicep' = if (enableFrontDoor) {
  name: 'frontDoorDeployment'
  params: {
    skuName: frontDoorSkuName
    originHostname: staticWebApp.outputs.defaultHostname
    customDomainName: frontDoorCustomDomain
    enableManagedRules: frontDoorEnableManagedRules
    wafMode: frontDoorWafMode
    rateLimitThreshold: frontDoorRateLimitThreshold
    tags: tags
  }
}

// --------- Outputs ---------

// Frontend outputs
@description('Frontend hosting endpoints and configuration')
output frontend object = {
  staticWebApp: {
    name: staticWebApp.outputs.name
    hostname: staticWebApp.outputs.defaultHostname
    url: 'https://${staticWebApp.outputs.defaultHostname}'
  }
  frontDoor: enableFrontDoor ? {
    endpoint: frontDoor.?outputs.endpointHostname ?? ''
    url: 'https://${frontDoor.?outputs.endpointHostname ?? ''}'
    enabled: true
  } : {
    endpoint: ''
    url: ''
    enabled: false
  }
}

// Database outputs
@description('Database connection information')
output database object = {
  serverName: postgres.outputs.serverNameOut
  host: postgres.outputs.hostOut
  databaseName: postgres.outputs.dbNameOut
  username: dbUser
  port: 5432
}

// Infrastructure outputs
@description('Infrastructure resource names')
output infrastructure object = {
  keyVault: {
    name: keyVault.outputs.name
    uri: keyVault.outputs.vaultUri
  }
  storage: {
    name: storage.outputs.name
  }
  resourceGroup: resourceGroup().name
  location: location
}

// Legacy outputs (for backward compatibility)
@description('Static Web App default hostname')
output staticWebAppHostname string = staticWebApp.outputs.defaultHostname

@description('Static Web App name')
output staticWebAppName string = staticWebApp.outputs.name

@description('Front Door endpoint hostname')
output frontDoorEndpoint string = enableFrontDoor ? frontDoor.?outputs.endpointHostname ?? '' : ''

@description('Front Door custom domain hostname')
output frontDoorCustomDomain string = enableFrontDoor ? frontDoor.?outputs.customDomainHostname ?? '' : ''

@description('Key Vault name')
output keyVaultName string = keyVault.outputs.name

@description('Postgres server name')
output postgresServerName string = postgres.outputs.serverNameOut

@description('Storage account name')
output storageAccountName string = storage.outputs.name
