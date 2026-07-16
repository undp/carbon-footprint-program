// storage.tf — object storage for file uploads.
//
// Mirrors infra/modules/storage.bicep (Azure Storage Account + "files" blob
// container + CORS). Here it is an S3 bucket.
//
// KEYLESS auth (no static access key):
// The API's storage adapter (packages/storage/src/adapters/minioAdapter.ts)
// omits explicit credentials when MINIO_ACCESS_KEY / MINIO_SECRET_KEY are
// unset, so the AWS SDK v3 default credential chain picks up the ECS task
// role automatically. We therefore grant S3 access to the *task role* (see
// api.tf) instead of provisioning a long-lived IAM user + access key: no
// key to rotate, store, or leak, and nothing to inject into the task. The
// grant is least-privilege — scoped to this one bucket.

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
// Least-privilege S3 access for the API — granted to the ECS TASK ROLE.
// ---------------------------------------------------------------------------
// The application process assumes aws_iam_role.ecs_task (api.tf); the storage
// adapter reaches S3 through the credentials that role provides via the default
// chain. Object-level actions on <bucket>/*, bucket-level actions on the bucket
// ARN. CopyObject (used by the adapter) needs only Get on the source + Put on
// the destination, both covered. Scoped to this one bucket — nothing else.
resource "aws_iam_role_policy" "app_storage" {
  name = "${local.name_prefix}-app-storage-s3"
  role = aws_iam_role.ecs_task.id

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
