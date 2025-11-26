using '../main.bicep'

// Storage Account
param storageSkuName = 'Standard_LRS'

// Key Vault
param keyVaultSkuName = 'standard'

// Database
param dbUser = 'pgadmin'
param dbName = 'huella_latam'
param dbSkuName = 'Standard_B1ms'
param dbSkuTier = 'Burstable'
param dbStorageSizeGB = 32 // Minimum allowed
param dbBackupRetentionDays = 7 // Minimum allowed
param dbGeoRedundantBackup = 'Disabled'
param dbPassword = '' // Will be overridden by deploy.sh with generated password
param developerName = '' // Will be overridden by deploy.sh with DEVELOPER_NAME from the environment

// Special 0.0.0.0 range: allows access from Azure services only
param dbAllowedIpRanges = [
  {
    start: '0.0.0.0'
    end: '0.0.0.0'
  }
]

param availabilityZone = ''

// ============================================
// Static Web App Configuration
// ============================================

// SKU tier for Azure Static Web Apps
// - 'Free': $0/month, 100GB bandwidth, 0.5GB storage, ideal for development
// - 'Standard': $9/month, 100GB bandwidth, 250GB storage, custom domains, SLA 99.95%
param staticWebAppSkuName = 'Free'

// GitHub/GitLab/Bitbucket repository URL for automatic CI/CD deployment
// - Leave empty ('') for manual deployment using deploy-web.sh
// - Example: 'https://github.com/in-ventures/undp-huella-latam'
// - When set, Azure creates a GitHub Actions workflow automatically
// - Each push to the specified branch triggers automatic deployment
param staticWebAppRepositoryUrl = ''

// Git branch that triggers automatic deployment
// - Only used when repositoryUrl is set
// - Common values: 'main', 'master', 'production'
// - Pushes to this branch will redeploy the application
param staticWebAppBranch = 'main'

// Enable preview environments for Pull Requests
// - true: Creates temporary staging URLs for each PR (e.g., https://app-pr-123.azurestaticapps.net)
// - false: Only production environment, no PR previews
// - Useful for testing changes before merging to main branch
param staticWebAppStagingEnabled = false

// Allow Azure to update staticwebapp.config.json automatically
// - true: Azure can modify config file (recommended for CI/CD)
// - false: Manual config only, Azure doesn't touch it
param staticWebAppAllowConfigUpdates = true

// Git provider integration type
// - 'Custom': Manual deployment using deploy-web.sh (recommended for development)
// - 'GitHub': Automatic deployment via GitHub Actions
// - 'GitLab': Automatic deployment via GitLab CI/CD
// - 'Bitbucket': Automatic deployment via Bitbucket Pipelines
param staticWebAppProvider = 'Custom'

// Enable enterprise-grade CDN built into Static Web App
// - false: Standard hosting (recommended - use standalone Front Door instead)
// - true: Built-in enterprise CDN (requires Standard SKU, less flexible than standalone Front Door)
// Note: This is different from the standalone Front Door configured below
// Recommendation: Keep false and use standalone Front Door for better control
param staticWebAppEnterpriseCdn = false

// Custom domain for Static Web App (only used when Front Door is disabled)
// - Leave empty ('') to use default Azure domain: https://swa-xyz.azurestaticapps.net
// - Example: 'luis.huellalatam.org' or 'app.yourdomain.com'
// - Azure provisions SSL certificate automatically
// - You must configure DNS CNAME record pointing to Static Web App default hostname
// - Note: If Front Door is enabled, use frontDoorCustomDomain instead
// - Can be set via environment variable: STATIC_WEB_APP_CUSTOM_DOMAIN
param staticWebAppCustomDomain = ''

// ============================================
// Front Door Configuration (Global CDN)
// ============================================

// Enable Azure Front Door for global CDN and enhanced security
// Benefits when enabled:
//   - Global CDN with 118+ edge locations (ultra-low latency)
//   - Web Application Firewall (WAF) protection
//   - Advanced DDoS protection with Microsoft Threat Intelligence
//   - Smart routing to fastest origin
//   - Advanced analytics and monitoring
// Cost: ~$35/month base + bandwidth charges
// Recommendation:
//   - false: For development (saves $35/month)
//   - true: For staging/production (global performance + security)
param enableFrontDoor = false

// Azure Front Door SKU tier
// - 'Standard_AzureFrontDoor': Basic CDN, basic WAF, routing rules (~$35/month)
// - 'Premium_AzureFrontDoor': Advanced WAF with threat intelligence, Private Link (~$330/month)
// Most applications work well with Standard tier
param frontDoorSkuName = 'Standard_AzureFrontDoor'

// Custom domain name for Front Door endpoint (optional)
// - Leave empty ('') to use default Azure domain: https://endpoint-xyz.azurefd.net
// - Example: 'app.huellalatam.org' or 'www.yourdomain.com'
// - Azure provisions SSL certificate automatically
// - You must configure DNS CNAME record pointing to Front Door endpoint
// - Set via environment variable: FRONT_DOOR_CUSTOM_DOMAIN
param frontDoorCustomDomain = ''
