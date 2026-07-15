// -----------------------------------------------------------------------------
// storage.tf — Cloud Storage bucket for user file uploads + S3-interop creds.
//
// Azure-Bicep counterpart: infra/modules/storage.bicep
//   (Microsoft.Storage/storageAccounts + blobServices CORS + `files` container).
//
// Why HMAC keys: the app's storage adapter (packages/storage/src/adapters/
// minioAdapter.ts) is S3-native — it uses @aws-sdk/client-s3 with a static
// access key + secret and SigV4 presigning. Cloud Storage exposes an
// S3-compatible XML API at https://storage.googleapis.com authenticated with
// HMAC keys, so the unchanged app talks to GCS with STORAGE_PROVIDER=minio.
//
// Tradeoff: HMAC is a long-lived static credential (stored in Secret Manager).
// The keyless alternative — Workload Identity + the GCS-native JSON API — would
// be more secure but requires an app-code change (a new GCS adapter); this
// reference intentionally keeps the app contract fixed, so HMAC it is.
// -----------------------------------------------------------------------------

// Bucket that holds uploaded files (org docs, inventory certifications, etc.),
// mirroring the Bicep `files` container.
resource "google_storage_bucket" "files" {
  name     = local.files_bucket_name
  location = var.region

  // Uniform bucket-level access = IAM only, no per-object ACLs (best practice,
  // mirrors the Azure account with `allowBlobPublicAccess: false`).
  uniform_bucket_level_access = true

  // Hard block on ever making these objects public — files are always served via
  // presigned URLs, never anonymously (mirrors container `publicAccess: 'None'`).
  public_access_prevention = "enforced"

  labels = local.labels

  // CORS so the browser can PUT/GET directly against presigned URLs. Mirrors the
  // corsRules in infra/modules/storage.bicep (GET/PUT/HEAD, headers *, 3600s).
  // Only emitted when at least one web origin is known.
  dynamic "cors" {
    for_each = length(local.web_cors_origins) > 0 ? [1] : []
    content {
      origin          = local.web_cors_origins
      method          = ["GET", "PUT", "HEAD"]
      response_header = ["*"]
      max_age_seconds = 3600
    }
  }

  depends_on = [google_project_service.apis]
}

// Dedicated service account whose HMAC key the API uses for S3-interop access.
// (Azure counterpart: the App Service managed identity that receives Storage
// Blob Data Contributor via infra/modules/storageRoleAssignment.bicep.)
resource "google_service_account" "storage" {
  account_id   = "${var.name_prefix}-${var.environment}-storage"
  display_name = "Huella Latam storage (S3-interop HMAC) SA"
}

// Grant that SA object admin ON THE FILES BUCKET ONLY (least privilege). This is
// the identity the HMAC key authenticates as against the XML API.
resource "google_storage_bucket_iam_member" "storage_object_admin" {
  bucket = google_storage_bucket.files.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.storage.email}"
}

// The HMAC key: `access_id` becomes MINIO_ACCESS_KEY, `secret` becomes
// MINIO_SECRET_KEY. Both are wired into Secret Manager in secrets.tf.
resource "google_storage_hmac_key" "files" {
  service_account_email = google_service_account.storage.email

  depends_on = [google_project_service.apis]
}
