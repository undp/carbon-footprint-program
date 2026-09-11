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
param availabilityZone string = ''

@description('Tags to apply to the PostgreSQL server')
param tags object = {}

// Generate unique PostgreSQL server name (must be globally unique)
var postgresServerName = 'psql-${uniqueString(resourceGroup().id)}'

resource psql 'Microsoft.DBforPostgreSQL/flexibleServers@2025-08-01' = {
  name: postgresServerName
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
  tags: tags
}

@description('Array of allowed IP ranges')
param allowedIpRanges array

@description('Collation of the database.')
param collation string = 'es_ES.UTF8'

@description('Character set of the database.')
param charset string = 'UTF8'

resource firewallRules 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2025-08-01' = [
  for (ipRange, i) in allowedIpRanges: {
    parent: psql
    name: 'AllowedIP-${i}'
    properties: {
      startIpAddress: ipRange.start
      endIpAddress: ipRange.end
    }
  }
]

// Create the specified database
resource db 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2025-08-01' = {
  parent: psql
  name: dbName
  properties: {
    charset: charset
    collation: collation
  }
}

@description('Postgres extensions to allowlist via the azure.extensions server parameter. VECTOR (pgvector) is required by the chatbot corpus migration and is included by default — the migration runs CREATE EXTENSION IF NOT EXISTS vector, which fails on Flexible Server unless the extension is allowlisted first.')
param allowedExtensions array = [
  'VECTOR'
]

// azure.extensions server parameter.
//
// Azure Flexible Server refuses CREATE EXTENSION for anything not on this list,
// so a fresh deployment without it fails the Prisma migration outright with
// `extension "vector" is not available` — before the app ever starts. The
// allowlist was previously set by hand on the running server, which meant the
// setting existed in the deployed environment but not in this template; any new
// environment built from Bicep would have hit that failure.
//
// This is an allowlist, not an append: the value replaces whatever is currently
// set. Add to `allowedExtensions` rather than issuing a separate az command, or
// the next deployment reverts it.
//
// pgvector needs no shared_preload_libraries entry, so azure.extensions is the
// only server parameter involved.
resource extensionsAllowlist 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2025-08-01' = {
  parent: psql
  // Ordering only: a parameter write puts the server into an updating state, and
  // Flexible Server rejects concurrent child operations while that runs.
  dependsOn: [
    db
  ]
  name: 'azure.extensions'
  properties: {
    value: join(allowedExtensions, ',')
    source: 'user-override'
  }
}

var host = '${psql.name}.postgres.database.azure.com'

// Outputs for tracking deployment progress
output serverNameOut string = psql.name
output serverIdOut string = psql.id
output dbNameOut string = dbName
output hostOut string = host
