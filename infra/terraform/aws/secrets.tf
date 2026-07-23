// secrets.tf — generated DB password and Secrets Manager containers.
//
// Mirrors infra/modules/keyVault.bicep (Azure Key Vault): secrets are generated
// and stored, never hardcoded. AWS Secrets Manager holds three values injected
// into the ECS task at runtime:
//   - DATABASE_URL   (full connection string, built here)
//   - MINIO_ACCESS_KEY / MINIO_SECRET_KEY (the app's S3 IAM key)
//
// The DATABASE_URL value is defined here (it depends on the RDS endpoint —
// Terraform resolves the ordering). The MinIO secret *containers* are declared
// here but their *versions* are set in storage.tf, where the IAM access key
// actually exists.
//
// recovery_window_in_days = 0 lets `terraform destroy` remove the secrets
// immediately instead of scheduling them for deletion, so a re-apply with the
// same names does not collide with a "scheduled for deletion" secret.

// Random DB admin password. override_special sticks to URL-safe unreserved
// characters so urlencode() below is a no-op and RDS (which rejects / " @) is happy.
resource "random_password" "db" {
  length           = 32
  special          = true
  override_special = "-_.~"
}

// ----- DATABASE_URL -----

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${local.name_prefix}-database-url"
  description             = "Full PostgreSQL connection string for the API (DATABASE_URL)"
  recovery_window_in_days = 0
}

// Built from the RDS endpoint + generated password. Matches the format used in
// appService.bicep: postgresql://user:pass@host:5432/db?sslmode=require.
// The password is URL-encoded so any special character stays valid in the URI.
resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${var.db_username}:${urlencode(random_password.db.result)}@${aws_db_instance.main.address}:5432/${var.db_name}?sslmode=require"
}

// ----- MinIO (S3) access key -----
// Containers only; versions are populated in storage.tf from aws_iam_access_key.

resource "aws_secretsmanager_secret" "minio_access_key" {
  name                    = "${local.name_prefix}-minio-access-key"
  description             = "S3 access key id used by the API storage adapter (MINIO_ACCESS_KEY)"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret" "minio_secret_key" {
  name                    = "${local.name_prefix}-minio-secret-key"
  description             = "S3 secret access key used by the API storage adapter (MINIO_SECRET_KEY)"
  recovery_window_in_days = 0
}
