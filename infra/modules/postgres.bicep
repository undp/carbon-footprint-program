@description('Location')
param location string

@secure()
@description('Postgres admin password')
param password string

@description('Database name to create')
param dbName string

@description('Postgres admin username')
param user string

@description('Postgres SKU name this is used to define the compute and pricing tier')
param skuName string

@description('Postgres SKU tier (e.g., Burstable, GeneralPurpose, MemoryOptimized)')
param skuTier string

@description('Storage size in GB for the Postgres server')
param storageSizeGB int

@description('Backup retention days for the Postgres server')
param backupRetentionDays int

@description('Geo-redundant backup setting for the Postgres server')
param geoRedundantBackup string

@description('Availability zone for the Postgres server (1, 2, or 3). Set to empty string for regions without zones.')
param availabilityZone string = '1'

resource psql 'Microsoft.DBforPostgreSQL/flexibleServers@2025-08-01' = {
  name: uniqueString(resourceGroup().id)
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    administratorLogin: user
    administratorLoginPassword: password
    // Note: Availability zone '1' may not be available in all regions
    availabilityZone: availabilityZone
    version: '18'
    storage: {
      storageSizeGB: storageSizeGB
    }
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: geoRedundantBackup
    }
    highAvailability: {
      mode: 'Disabled'
    }
    createMode: 'Default'
  }
}

// Create the specified database
resource db 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2025-08-01' = {
  parent: psql
  name: dbName
  properties: {
    charset: 'UTF8'
    collation: 'es_ES.UTF8'
  }
}

var host = '${psql.name}.postgres.database.azure.com'

// Outputs for tracking deployment progress
output serverNameOut string = psql.name
output serverIdOut string = psql.id
output dbNameOut string = dbName
output hostOut string = host
