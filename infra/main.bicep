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

@description('Storage Account network ACL default action. Use Allow for development, Deny for production.')
@allowed([
  'Allow'
  'Deny'
])
param storageNetworkAclDefaultAction string = 'Deny'

@description('Additional allowed origin for blob storage CORS during local development (e.g., http://localhost:5173). Leave empty to disable.')
param storageDevAllowedOrigin string = ''

@description('Maximum allowed upload size in bytes. Must match the FILE_UPLOAD_MAX_BYTES system parameter seeded into the database; the application reads the system parameter at runtime, this value is passed to the storage module so future infra-level enforcement (eg. Event Grid orphan cleanup) can reuse the same number.')
@minValue(1)
@maxValue(1073741824)
param storageFileUploadMaxBytes int = 20971520

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

@description('Grant Key Vault Secrets Officer role to the dev group (for local development with az login)')
param enableDevGroupKeyVaultAccess bool = false

@description('Grant Storage Blob Data Contributor to the dev group (for local development with az login)')
param enableDevGroupStorageAccess bool = false

@description('Allowed IP ranges for PostgreSQL firewall')
param dbAllowedIpRanges array = []

@description('Availability zone for the Postgres server (1, 2, or 3). Set to empty string for regions without zones.')
param availabilityZone string = ''

@description('Environment name for resource naming and tagging')
param environment string

// --------- Static Web App parameters ---------
@allowed([
  'Free'
  'Standard'
])
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

// --------- App Service parameters ---------
@description('SKU name for App Service Plan (e.g., F1 for Free tier)')
param appServiceSkuName string = 'F1'

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

// --------- Container Registry parameters ---------
@description('Base name prefix for ACR (will be combined with uniqueString for global uniqueness)')
param acrNamePrefix string = 'acr'

@description('Container Registry SKU tier')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param acrSku string = 'Basic'


@description('Tags to apply to all resources')
param tags object = {
  Environment: environment
  Project: 'undp-huella-latam'
  ManagedBy: 'Bicep'
}

// --------- Azure Entra ID parameters ---------
@description('Enable Azure Entra ID authentication')
param enableAzureAuth bool = false

@description('Azure Entra ID tenant type: "external" (CIAM) or "organizational" (Azure AD)')
@allowed(['external', 'organizational'])
param azureAuthTenantType string = 'external'

@description('Azure Entra ID Tenant subdomain (only required for external/CIAM tenants)')
param azureAuthTenantSubdomain string = ''

@secure()
@description('Azure Entra ID Tenant ID (GUID format)')
param azureAuthTenantId string = ''

@secure()
@description('Azure Entra ID Api App Registration ID')
param azureAuthApiAppId string = ''

@secure()
@description('Azure Entra ID Front App Registration ID')
param azureAuthFrontAppId string = ''


// --------- Key Vault ---------
// We can create up to 1 key vault per deployment
module keyVault 'modules/keyVault.bicep' = {
  name: 'keyVaultDeployment'
  params: {
    skuName: keyVaultSkuName
    location: location
    dbPassword: dbPassword
    devGroupObjectId: devGroupObjectId
    enableDevGroupAccess: enableDevGroupKeyVaultAccess
    tags: tags
  }
}

// --------- Storage Account ---------
// Compute the allowed origin for blob storage CORS (same origin used for App Service CORS)
var allowedOrigin = enableFrontDoor
  ? (frontDoorCustomDomain != ''
    ? 'https://${frontDoorCustomDomain}'
    : 'https://${frontDoor!.outputs.endpointHostname}')
  : 'https://${staticWebApp.outputs.defaultHostname}'

module storage 'modules/storage.bicep' = {
  name: 'storageDeployment'
  params: {
    skuName: storageSkuName
    location: location
    networkAclDefaultAction: storageNetworkAclDefaultAction
    allowedOrigin: allowedOrigin
    devAllowedOrigin: storageDevAllowedOrigin
    fileUploadMaxBytes: storageFileUploadMaxBytes
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

// --------- Container Registry ---------
module acr 'modules/acr.bicep' = {
  name: 'acrDeployment'
  params: {
    acrNamePrefix: acrNamePrefix
    acrSku: acrSku
    tags: tags
  }
}

// --------- App Service ---------
module appService 'modules/appService.bicep' = {
  name: 'appServiceDeployment'
  params: {
    location: location
    skuName: appServiceSkuName
    databasePassword: existingKeyVault.getSecret(keyVault.outputs.postgresSecretName)
    databaseHost: postgres.outputs.hostOut
    databaseName: postgres.outputs.dbNameOut
    databaseUser: dbUser
    allowedOrigin: allowedOrigin
    useAcrManagedIdentity: true
    storageAccountName: storage.outputs.name
    enableAzureAuth: enableAzureAuth
    azureAuthTenantId: azureAuthTenantId
    azureAuthClientId: azureAuthApiAppId
    azureAuthTenantType: azureAuthTenantType
    azureAuthTenantSubdomain: azureAuthTenantSubdomain
    tags: tags
  }
}

// Role assignment to allow App Service to pull from ACR
module appServiceAcrPull 'modules/acrRoleAssignment.bicep' = {
  name: 'appServiceAcrPull'
  scope: resourceGroup()
  #disable-next-line no-unnecessary-dependson
  dependsOn: [
    appService
    acr
  ]
  params: {
    acrName: acr.outputs.name
    principalId: appService.outputs.principalId
  }
}

// Role assignment to allow App Service to read/write blobs in Storage Account
module appServiceStorageBlobContributor 'modules/storageRoleAssignment.bicep' = {
  name: 'appServiceStorageBlobContributor'
  scope: resourceGroup()
  #disable-next-line no-unnecessary-dependson
  dependsOn: [
    appService
    storage
  ]
  params: {
    storageAccountName: storage.outputs.name
    principalId: appService.outputs.principalId
  }
}

// Role assignment to allow Dev Group members to read/write blobs (for local development)
module devGroupStorageBlobContributor 'modules/storageRoleAssignment.bicep' = if (enableDevGroupStorageAccess && devGroupObjectId != '') {
  name: 'devGroupStorageBlobContributor'
  scope: resourceGroup()
  params: {
    storageAccountName: storage.outputs.name
    principalId: devGroupObjectId
    principalType: 'Group'
  }
}

// Role assignment to allow App Service to generate User Delegation SAS tokens
module appServiceStorageBlobDelegator 'modules/storageDelegatorRoleAssignment.bicep' = {
  name: 'appServiceStorageBlobDelegator'
  scope: resourceGroup()
  #disable-next-line no-unnecessary-dependson
  dependsOn: [
    appService
    storage
  ]
  params: {
    storageAccountName: storage.outputs.name
    principalId: appService.outputs.principalId
  }
}

// Role assignment to allow Dev Group members to generate User Delegation SAS tokens (for local development)
module devGroupStorageBlobDelegator 'modules/storageDelegatorRoleAssignment.bicep' = if (enableDevGroupStorageAccess && devGroupObjectId != '') {
  name: 'devGroupStorageBlobDelegator'
  scope: resourceGroup()
  params: {
    storageAccountName: storage.outputs.name
    principalId: devGroupObjectId
    principalType: 'Group'
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

// --------- Azure Entra External ID ---------
module azureAuth 'modules/azureAuth.bicep' = if (enableAzureAuth) {
  name: 'azureAuthDeployment'
  params: {
    keyVaultName: keyVault.outputs.name
    tenantType: azureAuthTenantType
    tenantSubdomain: azureAuthTenantSubdomain
    tenantId: azureAuthTenantId
    apiAppId: azureAuthApiAppId
    frontAppId: azureAuthFrontAppId
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

// API outputs
@description('API hosting endpoints and configuration')
output api object = {
  appService: {
    name: appService.outputs.name
    hostname: appService.outputs.defaultHostname
    url: 'https://${appService.outputs.defaultHostname}'
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
  containerRegistry: {
    id: acr.outputs.id
    loginServer: acr.outputs.loginServer
    name: acr.outputs.name
    sku: acr.outputs.sku
  }
}

// Authentication outputs
@description('Authentication configuration')
output authentication object = enableAzureAuth ? {
  authorityUrl: azureAuth.?outputs.authorityUrl ?? ''
  enabled: true
} : {
  authorityUrl: ''
  enabled: false
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

@description('Front Door profile name')
output frontDoorProfileName string = enableFrontDoor ? frontDoor.?outputs.profileName ?? '' : ''

@description('Key Vault name')
output keyVaultName string = keyVault.outputs.name

@description('Postgres server name')
output postgresServerName string = postgres.outputs.serverNameOut

@description('Storage account name')
output storageAccountName string = storage.outputs.name

@description('App Service name')
output appServiceName string = appService.outputs.name

@description('App Service default hostname')
output appServiceHostname string = appService.outputs.defaultHostname

@description('Container Registry resource ID')
output containerRegistryId string = acr.outputs.id

@description('Container Registry login server')
output acrLoginServer string = acr.outputs.loginServer

