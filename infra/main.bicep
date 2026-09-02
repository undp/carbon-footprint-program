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

// --------- RBAC parameters ---------
// The role assignments below are the only resources in this template that need
// `Microsoft.Authorization/roleAssignments/write`. Contributor does NOT include that action, and
// ARM checks it during pre-flight validation — so a Contributor-only operator fails the *whole*
// stack deploy even when every assignment already exists and would be a no-op (the names are
// deterministic guids, so re-deploys are idempotent).
//
// deploy.sh computes this: it probes the caller's effective access with the Authorization
// checkAccess API and passes false only when the account genuinely cannot write role assignments,
// so the rest of the stack still deploys. It is intentionally not operator-configurable.
//
// Skipping only preserves the existing assignments under ACTION_ON_UNMANAGE=detachAll: a
// stack-managed resource that stops being declared is DELETED under deleteResources, so deploy.sh
// refuses that combination outright. On a fresh resource group, skipping leaves the App Service
// identity with no AcrPull (image pull fails) and no blob access, so a privileged principal has to
// run one deploy. The durable fix is granting the operator Role Based Access Control Administrator
// on the resource group.
@description('Create the RBAC role assignments owned by this template (App Service managed identity + optional dev group). Requires the deploying principal to hold Role Based Access Control Administrator, User Access Administrator or Owner. Computed by deploy.sh — set to false only when the caller cannot write role assignments.')
param enableRoleAssignments bool = true

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

// Passed to the API as TRUST_PROXY. Empty by default, which reproduces what
// every existing deployment already does — so redeploying this template does
// not change request handling on its own. Deliberately NOT derived from
// enableFrontDoor: the hop count depends on the real request path, and guessing
// it wrong is not a no-op in either direction (too few hops trusted keeps the
// shared rate-limit bucket; too many lets a caller forge X-Forwarded-For and
// choose its own). Set it once verified — see docs/security/hardening.md.
@description('Fastify trustProxy for the API (TRUST_PROXY). Empty = trust nothing (current behaviour). "1" = App Service alone; "2" = behind Front Door; or an IP/CIDR allowlist.')
param apiTrustProxy string = ''

// --------- Front Door parameters ---------
@description('Enable Azure Front Door')
param enableFrontDoor bool = false

@description('SKU for Azure Front Door')
@allowed([
  'Standard_AzureFrontDoor'
  'Premium_AzureFrontDoor'
])
param frontDoorSkuName string

@description('Custom domain to expose the frontend (e.g., app.example.com). Bicep binds it to Front Door when enableFrontDoor=true, otherwise to the Static Web App. The same value is propagated to App Service CORS, Fastify ALLOWED_ORIGIN, and Blob Storage CORS. Empty to use the default Azure-managed hostname.')
param frontendCustomDomain string = ''

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


// --------- Chatbot (optional AI feature) ---------
//
// Off by default, and the default is load-bearing: the platform is a digital
// public good that must remain fully usable with no AI and no cloud AI
// dependency. Enabling this provisions an Azure OpenAI account with two model
// deployments and grants the App Service inference access.
//
// Before setting this to true, read
// docs/infrastructure/chatbot-ai-access-requirements.md — in UNDP-governed
// subscriptions an Azure Policy denies AI resource creation outright until an
// exemption is granted, which no role assignment can bypass.
@description('Enable the AI chatbot: provisions Azure OpenAI, its chat + embedding deployments, and the App Service role assignment. Requires an Azure Policy exemption in UNDP-governed subscriptions.')
param enableChatbot bool = false

@description('Location for the Azure OpenAI account. Defaults to the resource group location, but model availability is regional — override when the RG region does not offer both models.')
param openAiLocation string = ''

@description('Chat model deployment name')
param openAiChatDeploymentName string = 'chat'

@description('Chat model to deploy')
param openAiChatModelName string = 'gpt-4o-mini'

@description('Chat model version')
param openAiChatModelVersion string = '2024-07-18'

@description('Chat capacity in thousands of tokens per minute')
param openAiChatCapacity int = 30

@description('Embedding model deployment name')
param openAiEmbeddingDeploymentName string = 'embeddings'

@description('Embedding model to deploy. Must emit 1024-dimensional vectors to match the vector(1024) column.')
param openAiEmbeddingModelName string = 'text-embedding-3-large'

@description('Embedding model version')
param openAiEmbeddingModelVersion string = '1'

@description('Embedding capacity in thousands of tokens per minute')
param openAiEmbeddingCapacity int = 50

@secure()
@description('Secret used to sign the chatbot cookies (COOKIE_SECRET). Stored in Key Vault and referenced by the App Service. Supplied by deploy.sh; leave empty to preserve an existing value.')
param chatbotCookieSecret string = ''

// --------- Key Vault ---------
// We can create up to 1 key vault per deployment
module keyVault 'modules/keyVault.bicep' = {
  name: 'keyVaultDeployment'
  params: {
    skuName: keyVaultSkuName
    location: location
    dbPassword: dbPassword
    cookieSecret: chatbotCookieSecret
    devGroupObjectId: devGroupObjectId
    // The module's dev-group grant is a role assignment too, so it follows enableRoleAssignments.
    enableDevGroupAccess: enableRoleAssignments && enableDevGroupKeyVaultAccess
    tags: tags
  }
}

// --------- Storage Account ---------
// Compute the allowed origin for blob storage CORS (same origin used for App Service CORS and Fastify ALLOWED_ORIGIN).
// When a custom domain is set, it always wins regardless of which front-end resource it binds to.
var allowedOrigin = frontendCustomDomain != ''
  ? 'https://${frontendCustomDomain}'
  : (enableFrontDoor
    ? 'https://${frontDoor!.outputs.endpointHostname}'
    : 'https://${staticWebApp.outputs.defaultHostname}')

module storage 'modules/storage.bicep' = {
  name: 'storageDeployment'
  params: {
    skuName: storageSkuName
    location: location
    networkAclDefaultAction: storageNetworkAclDefaultAction
    allowedOrigin: allowedOrigin
    devAllowedOrigin: storageDevAllowedOrigin
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
    // Bind the custom domain to the SWA only when Front Door is not in the path;
    // otherwise Front Door owns the public hostname and the SWA stays on its default hostname.
    customDomainName: enableFrontDoor ? '' : frontendCustomDomain
    tags: tags
  }
}

// --------- Azure OpenAI (chatbot) ---------
module openAi 'modules/openai.bicep' = if (enableChatbot) {
  name: 'openAiDeployment'
  params: {
    location: openAiLocation != '' ? openAiLocation : location
    chatDeploymentName: openAiChatDeploymentName
    chatModelName: openAiChatModelName
    chatModelVersion: openAiChatModelVersion
    chatCapacity: openAiChatCapacity
    embeddingDeploymentName: openAiEmbeddingDeploymentName
    embeddingModelName: openAiEmbeddingModelName
    embeddingModelVersion: openAiEmbeddingModelVersion
    embeddingCapacity: openAiEmbeddingCapacity
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
    trustProxy: apiTrustProxy
    useAcrManagedIdentity: true
    storageAccountName: storage.outputs.name
    enableAzureAuth: enableAzureAuth
    azureAuthTenantId: azureAuthTenantId
    azureAuthClientId: azureAuthApiAppId
    azureAuthTenantType: azureAuthTenantType
    azureAuthTenantSubdomain: azureAuthTenantSubdomain
    enableChatbot: enableChatbot
    // `!` asserts the conditional module is present: these branches are only
    // evaluated when enableChatbot is true, which is exactly when the module
    // deployed. Same pattern as the Front Door hostname above.
    openAiEndpoint: enableChatbot ? openAi!.outputs.endpoint : ''
    openAiChatDeploymentName: enableChatbot ? openAi!.outputs.chatDeploymentNameOut : ''
    openAiEmbeddingDeploymentName: enableChatbot ? openAi!.outputs.embeddingDeploymentNameOut : ''
    cookieSecret: enableChatbot ? existingKeyVault.getSecret(keyVault.outputs.cookieSecretNameOut) : ''
    tags: tags
  }
}

// Role assignment to allow App Service to pull from ACR
module appServiceAcrPull 'modules/acrRoleAssignment.bicep' = if (enableRoleAssignments) {
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

// Role assignment to allow App Service to call Azure OpenAI without an API key.
//
// Gated on enableRoleAssignments like the others, but note the consequence when
// that is false and the chatbot is on: the resources deploy, the app settings
// point at them, and every chatbot request fails with 401 until someone with
// User Access Administrator creates this assignment by hand. That is the most
// common chatbot rollout failure — see
// docs/infrastructure/chatbot-ai-access-requirements.md section 3.
module appServiceOpenAiUser 'modules/openAiRoleAssignment.bicep' = if (enableRoleAssignments && enableChatbot) {
  name: 'appServiceOpenAiUser'
  scope: resourceGroup()
  #disable-next-line no-unnecessary-dependson
  dependsOn: [
    appService
    openAi
  ]
  params: {
    openAiAccountName: openAi!.outputs.name
    principalId: appService.outputs.principalId
  }
}

// Role assignment to allow App Service to read/write blobs in Storage Account
module appServiceStorageBlobContributor 'modules/storageRoleAssignment.bicep' = if (enableRoleAssignments) {
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
module devGroupStorageBlobContributor 'modules/storageRoleAssignment.bicep' = if (enableRoleAssignments && enableDevGroupStorageAccess && devGroupObjectId != '') {
  name: 'devGroupStorageBlobContributor'
  scope: resourceGroup()
  params: {
    storageAccountName: storage.outputs.name
    principalId: devGroupObjectId
    principalType: 'Group'
  }
}

// Role assignment to allow App Service to generate User Delegation SAS tokens
module appServiceStorageBlobDelegator 'modules/storageDelegatorRoleAssignment.bicep' = if (enableRoleAssignments) {
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
module devGroupStorageBlobDelegator 'modules/storageDelegatorRoleAssignment.bicep' = if (enableRoleAssignments && enableDevGroupStorageAccess && devGroupObjectId != '') {
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
    customDomainName: frontendCustomDomain
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


// Flat outputs (consumed by the deploy scripts via `az stack group show`)
@description('Static Web App default hostname')
output staticWebAppHostname string = staticWebApp.outputs.defaultHostname

@description('Custom domain bound to the public frontend (Front Door or SWA depending on enableFrontDoor). Empty when not configured.')
output frontendCustomDomain string = frontendCustomDomain

@description('Origin authorized for CORS on App Service, Fastify and Blob Storage (includes https://). Single source of truth for deploy-web.sh / deploy-api.sh.')
output allowedOrigin string = allowedOrigin

@description('Static Web App name')
output staticWebAppName string = staticWebApp.outputs.name

@description('Front Door endpoint hostname')
output frontDoorEndpoint string = enableFrontDoor ? frontDoor.?outputs.endpointHostname ?? '' : ''

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

