// --------- General parameters ---------
@description('Location for resources')
param location string = resourceGroup().location

@description('Key Vault SKU')
param keyVaultSkuName string

@description('Storage Account SKU')
param storageSkuName string

// --------- Database parameters ---------
param dbUser string
param dbName string
param dbSkuName string
param dbSkuTier string
param dbStorageSizeGB int
param dbBackupRetentionDays int
param dbGeoRedundantBackup string

@secure()
@description('Postgres admin password')
param dbPassword string

@description('Object ID of the Azure AD group for Key Vault access (optional)')
param devGroupObjectId string = ''

// --------- Key Vault ---------
// We can create up to 1 key vault per deployment
module keyVault 'modules/keyVault.bicep' = {
  name: 'keyVaultDeployment'
  params: {
    skuName: keyVaultSkuName
    location: location
    dbPassword: dbPassword
    devGroupObjectId: devGroupObjectId
  }
}

// --------- Storage Account ---------
module storage 'modules/storage.bicep' = {
  name: 'storageDeployment'
  params: {
    skuName: storageSkuName
    location: location
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
  }
}
