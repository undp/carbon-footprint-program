// ============================================
// Azure Entra External ID Configuration
// ============================================
//
// This module creates the necessary Azure resources for:
// - External ID tenant authentication
// - Application registration
// - User flow configuration
//
// Note: Azure Entra External ID (CIAM) is not directly deployable via ARM/Bicep.
// This module creates supporting resources and provides configuration outputs.
// The actual External ID tenant must be created manually in the Azure Portal.
//
// Manual steps required:
// 1. Create External ID tenant in Azure Portal
// 2. Register application
// 3. Configure Email OTP authentication method
// 4. Note down Tenant ID and Client ID
// 5. Create client secret
// 6. Store credentials in Key Vault using this module
// ============================================

@description('Name of the Key Vault where auth secrets will be stored')
param keyVaultName string

@description('Azure Entra External ID Tenant subdomain (e.g., "undphuella" from undphuella.ciamlogin.com)')
param externalTenantSubdomain string

@description('Azure Entra External ID Tenant ID (GUID format)')
@secure()
param externalTenantId string

@description('Azure Entra External ID Application App (Client) ID')
@secure()
param apiAppId string

@description('Azure Entra External ID Application App (Client) ID')
@secure()
param frontAppId string

@description('Tags to apply to resources')
param tags object = {}

// Reference to existing Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource externalTenantSubdomainSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'azure-auth-external-tenant-subdomain'
  properties: {
    value: externalTenantSubdomain
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
  tags: tags
}

// Store Azure Entra External ID Tenant ID in Key Vault
resource externalTenantIdSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'azure-auth-external-tenant-id'
  properties: {
    value: externalTenantId
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
  tags: tags
}

// Store Azure Entra External ID Api App Registration ID in Key Vault
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

// Store Azure Entra External ID Front App Registration ID in Key Vault
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



// Generate authority URL with correct format
// Format: https://{tenant-subdomain}.ciamlogin.com/{external-tenant-id}/v2.0/
var authorityUrl = 'https://${externalTenantSubdomain}.ciamlogin.com/${externalTenantId}/v2.0/'

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
output externalTenantIdSecretName string = externalTenantIdSecret.name

@description('Name of the client ID secret in Key Vault')
output clientIdSecretName string = apiAppIdSecret.name


@description('Name of the authority URL secret in Key Vault')
output authoritySecretName string = authoritySecret.name

@description('Authority URL for Azure Entra External ID')
output authorityUrl string = authorityUrl

@description('Configuration summary for application settings')
output configuration object = {
  externalTenantIdSecretUri: externalTenantIdSecret.properties.secretUri
  externalTenantSubdomainSecretUri: externalTenantSubdomainSecret.properties.secretUri
  apiAppIdSecretUri: apiAppIdSecret.properties.secretUri
  frontAppIdSecretUri: frontAppIdSecret.properties.secretUri
  authoritySecretUri: authoritySecret.properties.secretUri
  authorityUrl: authorityUrl
}
