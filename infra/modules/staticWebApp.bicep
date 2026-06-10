@description('Location for the Static Web App')
param location string = resourceGroup().location

@description('SKU tier for Azure Static Web Apps')
@allowed([
  'Free'
  'Standard'
])
param skuName string = 'Free'

@description('Repository URL for automatic CI/CD deployment (leave empty for manual deployment)')
param repositoryUrl string = ''

@description('Git branch that triggers automatic deployment')
param branch string = 'main'

@description('Enable preview environments for Pull Requests')
param stagingEnabled bool = true

@description('Allow Azure to update staticwebapp.config.json automatically')
param allowConfigUpdates bool = true

@description('Git provider type (GitHub, GitLab, Bitbucket, or Custom for manual deployment)')
param provider string = 'Custom'

@description('Enable enterprise-grade CDN built into Static Web App (requires Standard SKU)')
param enterpriseCdn bool = false

@description('Application location relative to repository root')
param appLocation string = '/apps/web'

@description('Build output location relative to app location')
param outputLocation string = 'dist'

@description('Custom domain to bind to the Static Web App (e.g., app.example.com). Empty to skip. Use a CNAME-validated subdomain; apex domains require dns-txt-token validation and additional setup.')
param customDomainName string = ''

@description('Tags to apply to resources')
param tags object = {}

// Generate unique Static Web App name
var staticWebAppName = 'swa-${uniqueString(resourceGroup().id)}'

// Static Web App resource
resource staticWebApp 'Microsoft.Web/staticSites@2025-03-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuName
  }
  properties: union(
    {
      buildProperties: {
        appLocation: appLocation
        outputLocation: outputLocation
      }
      stagingEnvironmentPolicy: stagingEnabled ? 'Enabled' : 'Disabled'
      allowConfigFileUpdates: allowConfigUpdates
      provider: provider
      enterpriseGradeCdnStatus: enterpriseCdn ? 'Enabled' : 'Disabled'
    },
    // Only include repositoryUrl and branch if repositoryUrl is not empty
    repositoryUrl != '' ? {
      repositoryUrl: repositoryUrl
      branch: branch
    } : {}
  )
}

// Custom domain (CNAME validation). The DNS CNAME record must already point to
// defaultHostname and be propagated BEFORE deploy: 'cname-delegation' validates
// synchronously at create time, so an unresolved record fails this resource and,
// because it lives in the deployment stack, fails the whole deploy.sh run.
resource customDomain 'Microsoft.Web/staticSites/customDomains@2025-03-01' = if (customDomainName != '') {
  parent: staticWebApp
  name: customDomainName
  properties: {
    validationMethod: 'cname-delegation'
  }
}

// Outputs
@description('Static Web App resource ID')
output id string = staticWebApp.id

@description('Static Web App name')
output name string = staticWebApp.name

@description('Default hostname of the Static Web App')
output defaultHostname string = staticWebApp.properties.defaultHostname

@description('Deployment token for CI/CD (sensitive)')
@secure()
output deploymentToken string = staticWebApp.listSecrets().properties.apiKey
