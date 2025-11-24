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
