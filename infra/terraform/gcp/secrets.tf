// -----------------------------------------------------------------------------
// secrets.tf — generated DB password + Secret Manager secrets for the API.
//
// Azure-Bicep counterpart: infra/modules/keyVault.bicep (the Key Vault that
// holds the Postgres password) plus the `getSecret()` wiring in infra/main.bicep
// that injects secrets into the App Service. Here the three runtime credentials
// (DATABASE_URL, MINIO_ACCESS_KEY, MINIO_SECRET_KEY) live in Secret Manager and
// are injected into Cloud Run via value_source.secret_key_ref (see api.tf).
// -----------------------------------------------------------------------------

// Generated Postgres password — never hardcoded (Bicep passes @secure() dbPassword).
resource "random_password" "db" {
  length  = 32
  special = true
  // Exclude characters that are awkward inside a URL even after encoding.
  override_special = "!#$%*()-_=+[]{}"
}

// --------- DATABASE_URL ---------
// Full connection string for Cloud Run → Cloud SQL over the Auth Proxy socket.
// The password is URL-encoded; the host is the unix socket path the Cloud SQL
// volume mounts at /cloudsql/<instance_connection_name>.
resource "google_secret_manager_secret" "database_url" {
  secret_id = "${local.name_prefix}-database-url"
  labels    = local.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://${var.db_username}:${urlencode(random_password.db.result)}@localhost/${var.db_name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}"
}

// --------- MINIO_ACCESS_KEY (HMAC access id) ---------
resource "google_secret_manager_secret" "minio_access_key" {
  secret_id = "${local.name_prefix}-minio-access-key"
  labels    = local.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "minio_access_key" {
  secret      = google_secret_manager_secret.minio_access_key.id
  secret_data = google_storage_hmac_key.files.access_id
}

// --------- MINIO_SECRET_KEY (HMAC secret) ---------
resource "google_secret_manager_secret" "minio_secret_key" {
  secret_id = "${local.name_prefix}-minio-secret-key"
  labels    = local.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "minio_secret_key" {
  secret      = google_secret_manager_secret.minio_secret_key.id
  secret_data = google_storage_hmac_key.files.secret
}

// --------- Per-secret access for the Cloud Run service account ---------
// Least privilege: grant secretAccessor on each secret individually rather than
// project-wide (Azure grants the App Service identity access to the vault).
resource "google_secret_manager_secret_iam_member" "api_database_url" {
  secret_id = google_secret_manager_secret.database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_secret_manager_secret_iam_member" "api_minio_access_key" {
  secret_id = google_secret_manager_secret.minio_access_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_secret_manager_secret_iam_member" "api_minio_secret_key" {
  secret_id = google_secret_manager_secret.minio_secret_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}
