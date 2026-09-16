// locals.tf — derived names and shared data sources.
//
// The Azure Bicep suffixes globally-unique resource names with
// uniqueString(resourceGroup().id). S3 bucket names are likewise global, so we
// suffix them with the account id to avoid collisions between adopters while
// staying deterministic across applies.

data "aws_caller_identity" "current" {}

locals {
  // <name_prefix>-<environment>, e.g. "huella-prod". Base for every resource name.
  name_prefix = "${var.name_prefix}-${var.environment}"

  // Web origins allowed to talk to S3 directly for presigned PUT/GET.
  // Mirrors the allowedOrigins list in infra/modules/storage.bicep
  // (production origin plus an optional local-dev origin). Empties dropped.
  web_cors_origins = compact([var.allowed_origin, var.dev_allowed_origin])

  // Globally-unique S3 bucket names (see header note).
  files_bucket_name = "${local.name_prefix}-files-${data.aws_caller_identity.current.account_id}"
  web_bucket_name   = "${local.name_prefix}-web-${data.aws_caller_identity.current.account_id}"
}
