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

@description('Azure Entra External ID Tenant ID')
@secure()
param tenantId string

@description('Azure Entra External ID Application (Client) ID')
@secure()
param clientId string

@description('Tags to apply to resources')
param tags object = {}

// Reference to existing Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// Store Azure Entra External ID Tenant ID in Key Vault
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

// Store Azure Entra External ID Client ID in Key Vault
resource clientIdSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'azure-auth-client-id'
  properties: {
    value: clientId
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
  tags: tags
}


// Generate authority URL
var authorityUrl = 'https://${tenantId}.ciamlogin.com/${tenantId}'

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
output clientIdSecretName string = clientIdSecret.name


@description('Name of the authority URL secret in Key Vault')
output authoritySecretName string = authoritySecret.name

@description('Authority URL for Azure Entra External ID')
output authorityUrl string = authorityUrl

@description('Configuration summary for application settings')
output configuration object = {
  tenantIdSecretUri: tenantIdSecret.properties.secretUri
  clientIdSecretUri: clientIdSecret.properties.secretUri
  authoritySecretUri: authoritySecret.properties.secretUri
  authorityUrl: authorityUrl
}
