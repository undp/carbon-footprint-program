// -----------------------------------------------------------------------------
// database.tf — Cloud SQL for PostgreSQL.
//
// Azure-Bicep counterpart: infra/modules/postgres.bicep
//   (Microsoft.DBforPostgreSQL/flexibleServers + database + firewallRules).
//
// Connectivity: the instance has a public IP but NO authorized networks, so it
// is not reachable from the internet. Cloud Run connects exclusively through the
// built-in Cloud SQL Auth Proxy (unix socket) using the instance connection name
// (see api.tf). This is the "keep it simple + secure" default — no VPC connector
// needed. When `enable_private_networking = true`, a private IP is also attached
// via the peering created in network.tf.
// -----------------------------------------------------------------------------

resource "google_sql_database_instance" "main" {
  name             = "${local.name_prefix}-pg"
  region           = var.region
  database_version = var.postgres_version

  // Default false lets reference stacks be destroyed cleanly; flip to true for
  // real environments (mirrors the intent behind the Azure server lifecycle).
  deletion_protection = var.db_deletion_protection

  settings {
    tier              = var.db_tier
    disk_size         = var.db_disk_size
    disk_autoresize   = true
    availability_type = var.db_availability_type

    // Mirrors infra/modules/postgres.bicep `backup`.
    backup_configuration {
      enabled = var.db_backup_enabled
    }

    ip_configuration {
      // Public IP is enabled but, crucially, there are NO authorized_networks —
      // nothing on the internet may open a connection. Access is only via the
      // Cloud SQL Auth Proxy socket that Cloud Run mounts.
      ipv4_enabled = true

      // Optional hardening: attach a private IP from the VPC peering. Null (and
      // thus omitted) on the default public-only path.
      private_network = var.enable_private_networking ? one(google_compute_network.vpc[*].id) : null
    }

    // Also expose deletion protection at the instance-settings level for parity.
    deletion_protection_enabled = var.db_deletion_protection

    user_labels = local.labels
  }

  // Wait for the sqladmin API, and (when enabled) the private services peering,
  // before creating the instance. Whole-resource refs are count-safe.
  depends_on = [
    google_project_service.apis,
    google_service_networking_connection.private_vpc,
  ]
}

// The application database (mirrors the Bicep `db` child resource).
resource "google_sql_database" "app" {
  name     = var.db_name
  instance = google_sql_database_instance.main.name
}

// The application database user. Password is generated in secrets.tf and never
// hardcoded (mirrors `administratorLogin` / `administratorLoginPassword`).
resource "google_sql_user" "app" {
  name     = var.db_username
  instance = google_sql_database_instance.main.name
  password = random_password.db.result
}
