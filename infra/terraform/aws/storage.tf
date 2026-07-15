// storage.tf — object storage for file uploads.
//
// Mirrors infra/modules/storage.bicep (Azure Storage Account + "files" blob
// container + CORS). Here it is an S3 bucket.
//
// IMPORTANT — static-key tradeoff:
// The API's storage adapter (packages/storage/src/adapters/minioAdapter.ts)
// constructs an S3Client with an explicit accessKeyId/secretAccessKey. It does
// NOT use the AWS default credential chain, so it cannot pick up the ECS task
// role. We therefore create a dedicated IAM *user* with a long-lived access
// key and inject it as MINIO_ACCESS_KEY / MINIO_SECRET_KEY. Switching to
// keyless auth (task role via the default credential chain) would require an
// APP-CODE change in the adapter and is intentionally out of scope for this
// reference. The key is least-privilege (scoped to this one bucket) and stored
// in Secrets Manager, never in plaintext task config.

// ---------------------------------------------------------------------------
// Files bucket (user uploads: org docs, carbon-inventory certifications, ...)
// ---------------------------------------------------------------------------

resource "aws_s3_bucket" "files" {
  bucket = local.files_bucket_name

  tags = {
    Name = "${local.name_prefix}-files"
  }
}

// Equivalent of allowBlobPublicAccess=false: block every public access path.
// Access is via presigned URLs only.
resource "aws_s3_bucket_public_access_block" "files" {
  bucket = aws_s3_bucket.files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

// CORS so the browser can PUT/GET presigned URLs directly. Mirrors the corsRules
// in storage.bicep: methods GET/PUT/HEAD, headers *, max-age 3600, origins = the
// web origin (+ optional dev origin). Only created when at least one origin is
// configured (an empty allowed-origins list is invalid).
//
// NOTE: unlike Azure Blob (which accepts exposedHeaders `*`), AWS S3 does not
// support a wildcard in `expose_headers` — it must be a concrete list. ETag is
// the one the browser reads back after a presigned PUT; the rest are the common
// response headers. Add more here if a future upload flow needs them exposed.
resource "aws_s3_bucket_cors_configuration" "files" {
  count  = length(local.web_cors_origins) > 0 ? 1 : 0
  bucket = aws_s3_bucket.files.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "HEAD"]
    allowed_origins = local.web_cors_origins
    expose_headers  = ["ETag", "Content-Length", "Content-Type"]
    max_age_seconds = 3600
  }
}

// ---------------------------------------------------------------------------
// Dedicated IAM user + least-privilege key for the API storage adapter.
// ---------------------------------------------------------------------------

resource "aws_iam_user" "app_storage" {
  name = "${local.name_prefix}-app-storage"

  tags = {
    Name = "${local.name_prefix}-app-storage"
  }
}

// Least-privilege S3 policy scoped to the files bucket. Object-level actions on
// <bucket>/*, bucket-level actions on the bucket ARN. CopyObject (used by the
// adapter) needs only Get on the source + Put on the destination, both covered.
resource "aws_iam_user_policy" "app_storage" {
  name = "${local.name_prefix}-app-storage-s3"
  user = aws_iam_user.app_storage.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ObjectAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:AbortMultipartUpload"
        ]
        Resource = "${aws_s3_bucket.files.arn}/*"
      },
      {
        Sid    = "BucketAccess"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = aws_s3_bucket.files.arn
      }
    ]
  })
}

resource "aws_iam_access_key" "app_storage" {
  user = aws_iam_user.app_storage.name
}

// Populate the MinIO secret containers declared in secrets.tf with the actual
// key material (kept here where aws_iam_access_key exists).
resource "aws_secretsmanager_secret_version" "minio_access_key" {
  secret_id     = aws_secretsmanager_secret.minio_access_key.id
  secret_string = aws_iam_access_key.app_storage.id
}

resource "aws_secretsmanager_secret_version" "minio_secret_key" {
  secret_id     = aws_secretsmanager_secret.minio_secret_key.id
  secret_string = aws_iam_access_key.app_storage.secret
}
