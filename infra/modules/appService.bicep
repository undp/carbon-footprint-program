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

@description('Node.js version (e.g., node|26-lts)')
param linuxFxVersion string = 'node|26-lts'

@description('Allowed origin for API CORS (e.g., https://app.example.com)')
param allowedOrigin string

// App Service always proxies to the container through its own front end, so
// `request.ip` inside the API is the platform's address, not the caller's. That
// is the rate limiter's bucket key (apps/api/src/plugins/external/rate-limit.ts),
// so leaving this empty means the 100 req/min limit is ONE bucket shared by
// every client rather than one per client.
//
// Empty is the default deliberately: it reproduces the behaviour every existing
// deployment already has, so a redeploy of this template changes nothing on its
// own. Setting it is a per-deployment decision because the correct value depends
// on how many proxies sit in front:
//   '1'  App Service alone — trust the single platform hop
//   '2'  App Service behind Front Door
// Verify against the deployment before setting it: trusting more hops than
// actually exist lets a caller forge X-Forwarded-For and pick its own bucket.
// An IP/CIDR allowlist is accepted too and is preferable where the proxy
// addresses are known and stable. See docs/security/hardening.md, "Proxy Trust".
@description('Fastify trustProxy for the API (TRUST_PROXY). Empty = trust nothing. "1" = App Service alone; "2" = behind Front Door; or an IP/CIDR allowlist.')
param trustProxy string = ''

@description('Enable managed identity credentials for container registry')
param useAcrManagedIdentity bool = false

@description('Azure Storage Account name for blob storage (file uploads)')
param storageAccountName string = ''

@description('Enable Azure Entra ID authentication')
param enableAzureAuth bool = false

@description('Azure Entra ID Tenant ID (GUID)')
param azureAuthTenantId string = ''

@description('Azure API App (token audience) Client ID')
param azureAuthClientId string = ''

@description('Azure tenant type: "external" (CIAM) or "organizational"')
param azureAuthTenantType string = 'external'

@description('Azure tenant subdomain (required for external/CIAM tenants)')
param azureAuthTenantSubdomain string = ''

@description('Enable the AI chatbot. When false the API boots with no AI code path, no Azure OpenAI dependency, and the widget stays hidden — the DPG optionality guarantee.')
param enableChatbot bool = false

@description('Azure OpenAI endpoint URL (required when enableChatbot is true)')
param openAiEndpoint string = ''

@description('Azure OpenAI chat deployment name (required when enableChatbot is true)')
param openAiChatDeploymentName string = ''

@description('Azure OpenAI embedding deployment name (required when enableChatbot is true)')
param openAiEmbeddingDeploymentName string = ''

@description('Secret used to sign the chatbot session and conversation cookies (COOKIE_SECRET). Required in production when the chatbot is enabled.')
@secure()
param cookieSecret string = ''

@description('Tags to apply to resources')
param tags object = {}

// Generate unique App Service Plan name
var appServicePlanName = 'asp-${uniqueString(resourceGroup().id)}'

// Generate unique App Service name
var appServiceName = 'api-${uniqueString(resourceGroup().id)}'

// Generic JWKS config derived from the Entra tenant settings. The per-provider
// URL format knowledge lives here (deploy IaC) and in the env templates — NOT in
// the API code, which only consumes JWKS_ISSUER / JWKS_URI / JWKS_AUDIENCE.
// External (CIAM): the issuer host uses the tenant GUID, the JWKS host uses the
// tenant subdomain. Organizational: both use login.microsoftonline.com.
var jwksIssuer = azureAuthTenantType == 'organizational'
  ? 'https://login.microsoftonline.com/${azureAuthTenantId}/v2.0'
  : 'https://${azureAuthTenantId}.ciamlogin.com/${azureAuthTenantId}/v2.0'
var jwksUri = azureAuthTenantType == 'organizational'
  ? 'https://login.microsoftonline.com/${azureAuthTenantId}/discovery/v2.0/keys'
  : 'https://${azureAuthTenantSubdomain}.ciamlogin.com/${azureAuthTenantId}/discovery/v2.0/keys'
var jwksAudience = azureAuthClientId

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
    // Enforce HTTPS: the platform 301-redirects any plain HTTP to HTTPS and stops
    // serving the HTTP listener. Required by UNDP Defender for Cloud policy. Safe here
    // because the API is only ever reached over HTTPS (ALLOWED_ORIGIN + front are https,
    // and *.azurewebsites.net ships a managed cert by default).
    httpsOnly: true
    serverFarmId: appServicePlan.id
    siteConfig: {
      // Reject TLS below 1.2 (companion hardening to httpsOnly).
      minTlsVersion: '1.2'
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
      ], trustProxy != '' ? [
        {
          name: 'TRUST_PROXY'
          value: trustProxy
        }
      ] : [], storageAccountName != '' ? [
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
          name: 'JWKS_ISSUER'
          value: jwksIssuer
        }
        {
          name: 'JWKS_URI'
          value: jwksUri
        }
        {
          name: 'JWKS_AUDIENCE'
          value: jwksAudience
        }
        {
          // The API validates Entra access tokens in-app via JWKS (issuer/URI/
          // audience above). Keep Azure App Service platform Authentication
          // disabled so it doesn't intercept requests before the API validates them.
          name: 'AUTH_PROVIDER'
          value: 'jwks'
        }
      ] : [], enableChatbot ? [
        {
          name: 'CHATBOT_ENABLED'
          value: 'true'
        }
        {
          name: 'LLM_PROVIDER'
          value: 'azure-openai'
        }
        {
          // The API refuses to boot in production with the mock embedding
          // provider while the chatbot is on: its SHA-256-derived vectors have
          // no semantic relation to the text, so retrieval would return noise
          // rather than fail. Setting it explicitly here means the deployment
          // never depends on the default.
          name: 'EMBEDDING_PROVIDER'
          value: 'azure-openai'
        }
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: openAiEndpoint
        }
        {
          name: 'AZURE_OPENAI_DEPLOYMENT_NAME'
          value: openAiChatDeploymentName
        }
        {
          name: 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME'
          value: openAiEmbeddingDeploymentName
        }
        {
          name: 'COOKIE_SECRET'
          value: cookieSecret
        }
      ] : [])
      // AZURE_OPENAI_API_KEY is deliberately absent. Setting it switches both the
      // chat and embedding clients off managed identity and onto a static key —
      // and the account is provisioned with local auth disabled, so the key would
      // not work anyway. It exists solely as a local-development fallback.
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
