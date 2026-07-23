// -----------------------------------------------------------------------------
// variables.tf — every adopter-tunable input.
//
// Azure-Bicep counterpart: the `param` declarations spread across infra/main.bicep
// and infra/params/main.<env>.bicepparam. Each has a description and, where a
// sensible default exists, a default (so a first `plan` works with only
// `project_id` + `api_image` set).
// -----------------------------------------------------------------------------

// --------- Core / project ---------
variable "project_id" {
  type        = string
  description = "GCP project ID to deploy into. Required — has no default. Billing must be enabled."
}

variable "region" {
  type        = string
  description = "GCP region for regional resources (Cloud Run, Cloud SQL, Artifact Registry, buckets). The global HTTPS LB is, by definition, global."
  default     = "us-central1"
}

variable "name_prefix" {
  type        = string
  description = "Short prefix for resource names. Combined with `environment` as <name_prefix>-<environment> (e.g. huella-prod)."
  default     = "huella"
}

variable "environment" {
  type        = string
  description = "Deployment environment name, used in naming and the `environment` label."
  default     = "prod"
}

// --------- Database (mirrors infra/modules/postgres.bicep) ---------
variable "postgres_version" {
  type = string
  // The Azure reference (infra/modules/postgres.bicep) provisions PostgreSQL 18.
  // Cloud SQL's newest generally-available major at authoring time is 17, so the
  // default is POSTGRES_17. Bump to POSTGRES_18 once GA in your region.
  description = "Cloud SQL PostgreSQL major version (e.g. POSTGRES_17). Azure reference uses PG18; adopters can bump when Cloud SQL offers it."
  default     = "POSTGRES_17"
}

variable "db_tier" {
  type        = string
  description = "Cloud SQL machine type. db-custom-2-8192 ≈ 2 vCPU / 8 GB, comparable to the Azure GeneralPurpose reference tier."
  default     = "db-custom-2-8192"
}

variable "db_disk_size" {
  type        = number
  description = "Cloud SQL data disk size in GB (autoresizes upward). Mirrors dbStorageSizeGB (min 32) in Bicep."
  default     = 32
}

variable "db_name" {
  type        = string
  description = "Application database name created on the instance. Mirrors `dbName`."
  default     = "huella_latam"
}

variable "db_username" {
  type        = string
  description = "Application database user. Mirrors `dbUser`. Its password is generated (see secrets.tf)."
  default     = "pgadmin"
}

variable "db_backup_enabled" {
  type        = bool
  description = "Enable automated Cloud SQL backups. Mirrors the Bicep backup configuration."
  default     = true
}

variable "db_deletion_protection" {
  type        = bool
  description = "Protect the Cloud SQL instance from deletion. Default false so reference stacks tear down cleanly; set true for real environments."
  default     = false
}

variable "db_availability_type" {
  type        = string
  description = "Cloud SQL availability: ZONAL (single zone) or REGIONAL (HA). Bicep reference runs highAvailability Disabled (≈ ZONAL)."
  default     = "ZONAL"

  validation {
    condition     = contains(["ZONAL", "REGIONAL"], var.db_availability_type)
    error_message = "db_availability_type must be ZONAL or REGIONAL."
  }
}

// --------- API / Cloud Run (mirrors infra/modules/appService.bicep) ---------
variable "api_image" {
  type = string
  // Placeholder — the image does not exist until you build and push it (see
  // README). Override with your real Artifact Registry ref before apply.
  description = "Full Artifact Registry image reference (including tag) for the API container. Override with your pushed image; the placeholder will not deploy."
  default     = "REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/api:latest"
}

variable "api_cpu" {
  type        = string
  description = "Cloud Run CPU limit per instance (e.g. \"1\", \"2\")."
  default     = "1"
}

variable "api_memory" {
  type        = string
  description = "Cloud Run memory limit per instance (e.g. \"512Mi\", \"1Gi\")."
  default     = "512Mi"
}

variable "api_min_instances" {
  type        = number
  description = "Minimum Cloud Run instances (>=1 keeps one warm, avoiding cold starts like the always-on App Service plan)."
  default     = 1
}

variable "api_max_instances" {
  type        = number
  description = "Maximum Cloud Run instances (autoscaling ceiling)."
  default     = 4
}

variable "api_allow_unauthenticated" {
  type        = bool
  description = "Grant roles/run.invoker to allUsers so the API is publicly reachable, like the Azure App Service. The app still enforces its own JWKS auth."
  default     = true
}

// --------- API environment (parity with docker-compose.prod.yml + Bicep) ---------
variable "allowed_origin" {
  type        = string
  description = "Browser origin of the web app for API CORS + Fastify ALLOWED_ORIGIN (e.g. https://app.example.com). Also used for files-bucket CORS."
  default     = ""
}

variable "api_origin" {
  type        = string
  description = "Public origin of THIS API (Cloud Run URL or custom domain), set as API_ORIGIN. May be empty on first apply, then set to the printed Cloud Run URL and re-applied."
  default     = ""
}

variable "jwks_issuer" {
  type        = string
  description = "OIDC token issuer (JWKS_ISSUER). From the adopter's BYO IdP. May be empty until auth is wired."
  default     = ""
}

variable "jwks_uri" {
  type        = string
  description = "OIDC JWKS endpoint (JWKS_URI). From the adopter's BYO IdP."
  default     = ""
}

variable "jwks_audience" {
  type        = string
  description = "Expected token audience (JWKS_AUDIENCE). Usually the API app/client id from the IdP."
  default     = ""
}

variable "jwks_required_scope" {
  type        = string
  description = "Optional scope required on tokens (JWKS_REQUIRED_SCOPE)."
  default     = ""
}

variable "jwks_skip_scope_check" {
  type        = string
  description = "Optional flag to skip scope enforcement (JWKS_SKIP_SCOPE_CHECK). Passed through as a string, matching the env contract."
  default     = ""
}

variable "superadmin_email" {
  type        = string
  description = "Optional bootstrap super-admin email (SUPERADMIN_EMAIL)."
  default     = ""
}

variable "app_version" {
  type        = string
  description = "Value for APP_VERSION env var, surfaced by the API."
  default     = "prod"
}

// --------- Frontend / networking / hardening ---------
variable "custom_domain_web" {
  type        = string
  description = "Custom domain for the web SPA (e.g. app.example.com). When set, a Google-managed SSL cert + HTTPS LB is provisioned; empty leaves an HTTP-only LB on the reserved IP."
  default     = ""
}

variable "enable_cloud_armor" {
  type        = bool
  description = "Attach a Cloud Armor EDGE security policy to the web backend bucket. See frontend.tf for the backend-bucket caveat."
  default     = false
}

variable "enable_private_networking" {
  type        = bool
  description = "Optional hardening: provision a VPC + Serverless VPC Access connector + Private Services Access and give Cloud SQL a private IP. Default false uses the simpler public-IP + Cloud SQL Auth Proxy path."
  default     = false
}
