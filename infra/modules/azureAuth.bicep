// ============================================
// Azure Entra ID Configuration
// ============================================
//
// This module creates the necessary Azure resources for:
// - Azure Entra ID tenant authentication (external/CIAM or organizational)
// - Application registration
// - User flow configuration
//
// Note: Azure Entra tenants are not directly deployable via ARM/Bicep.
// This module creates supporting resources and provides configuration outputs.
// The actual tenant must be created manually in the Azure Portal.
//
// Manual steps required:
// 1. Create tenant in Azure Portal (External ID or organizational)
// 2. Register application
// 3. Configure authentication method
// 4. Note down Tenant ID and Client ID
// 5. Create client secret
// 6. Store credentials in Key Vault using this module
// ============================================

@description('Name of the Key Vault where auth secrets will be stored')
param keyVaultName string

@description('Azure Entra ID tenant type: "external" (CIAM) or "organizational" (Azure AD)')
@allowed(['external', 'organizational'])
param tenantType string = 'external'

@description('Azure Entra ID Tenant subdomain (only required for external/CIAM tenants)')
param tenantSubdomain string = ''

@description('Azure Entra ID Tenant ID (GUID format)')
@secure()
param tenantId string

@description('Azure Entra ID API Application (Client) ID')
@secure()
param apiAppId string

@description('Azure Entra ID Front App Registration ID')
@secure()
param frontAppId string

@description('Tags to apply to resources')
param tags object = {}

// Reference to existing Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource tenantSubdomainSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'azure-auth-tenant-subdomain'
  properties: {
    value: tenantSubdomain
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
  tags: tags
}

// Store Azure Entra ID Tenant ID in Key Vault
resource tenantIdSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'azure-auth-tenant-id'
  properties: {
    value: tenantId
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
  tags: tags
}

// Store Azure Entra ID Api App Registration ID in Key Vault
resource apiAppIdSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'azure-auth-api-app-id'
  properties: {
    value: apiAppId
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
  tags: tags
}

// Store Azure Entra ID Front App Registration ID in Key Vault
resource frontAppIdSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'azure-auth-front-app-id'
  properties: {
    value: frontAppId
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
  tags: tags
}

// Generate authority URL based on tenant type
// External (CIAM): https://{tenant-subdomain}.ciamlogin.com/{tenant-id}/v2.0/
// Organizational:  https://login.microsoftonline.com/{tenant-id}/v2.0/
var authorityUrl = tenantType == 'external'
  ? 'https://${tenantSubdomain}.ciamlogin.com/${tenantId}/v2.0/'
  : 'https://login.microsoftonline.com/${tenantId}/v2.0/'

// Store Authority URL in Key Vault
resource authoritySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'azure-auth-authority'
  properties: {
    value: authorityUrl
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
  tags: tags
}

// ============================================
// Outputs
// ============================================

@description('Name of the tenant ID secret in Key Vault')
output tenantIdSecretName string = tenantIdSecret.name

@description('Name of the client ID secret in Key Vault')
output clientIdSecretName string = apiAppIdSecret.name

@description('Name of the authority URL secret in Key Vault')
output authoritySecretName string = authoritySecret.name

@description('Authority URL for Azure Entra ID')
output authorityUrl string = authorityUrl

@description('Configuration summary for application settings')
output configuration object = {
  tenantIdSecretUri: tenantIdSecret.properties.secretUri
  tenantSubdomainSecretUri: tenantSubdomainSecret.properties.secretUri
  apiAppIdSecretUri: apiAppIdSecret.properties.secretUri
  frontAppIdSecretUri: frontAppIdSecret.properties.secretUri
  authoritySecretUri: authoritySecret.properties.secretUri
  authorityUrl: authorityUrl
}
