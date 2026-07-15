// -----------------------------------------------------------------------------
// versions.tf — Terraform + provider setup and project-wide bootstrap.
//
// Azure-Bicep counterpart: the implicit provider/target-scope + shared naming
// (`uniqueString(resourceGroup().id)`) and the `tags` object that infra/main.bicep
// threads through every module. On GCP the equivalents are the google providers,
// a `local.name_prefix`, the `local.labels` map, and up-front API enablement
// (Azure resource providers are auto-registered; on GCP we enable them
// explicitly via google_project_service).
// -----------------------------------------------------------------------------

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.40"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.40"
    }
    // Used to generate the Cloud SQL password (secrets.tf).
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

// Application Default Credentials (ADC) are used for auth — run
// `gcloud auth application-default login` before `terraform apply`.
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

// -----------------------------------------------------------------------------
// Shared locals — the naming/labelling conventions the AWS stack mirrors too.
// -----------------------------------------------------------------------------
locals {
  // Naming pattern: ${name_prefix}-<role>, e.g. "huella-prod-api".
  name_prefix = "${var.name_prefix}-${var.environment}"

  // Applied to every resource that supports labels (Azure `tags` counterpart).
  labels = {
    project     = "undp-huella-latam"
    environment = var.environment
    managed_by  = "terraform"
    component   = "huella-latam"
  }

  // GCS bucket names are globally unique, so they are suffixed with the project
  // id (Bicep uses `uniqueString(resourceGroup().id)` for the same reason).
  files_bucket_name = "${local.name_prefix}-files-${var.project_id}"
  web_bucket_name   = "${local.name_prefix}-web-${var.project_id}"

  // CORS origins allowed to talk directly to the files bucket (browser presigned
  // PUT/GET). Mirrors infra/modules/storage.bicep `allowedOrigin`/`devAllowedOrigin`.
  web_cors_origins = compact(distinct([
    var.allowed_origin,
    var.custom_domain_web != "" ? "https://${var.custom_domain_web}" : "",
  ]))
}

// -----------------------------------------------------------------------------
// Google API enablement. Azure auto-registers resource providers; on GCP each
// API must be enabled on the project before its resources can be created.
// Resources below `depends_on` this where ordering matters.
// -----------------------------------------------------------------------------
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",               // Cloud Run (API service)
    "sqladmin.googleapis.com",          // Cloud SQL for PostgreSQL
    "secretmanager.googleapis.com",     // Secret Manager (DB URL, HMAC creds)
    "artifactregistry.googleapis.com",  // Artifact Registry (container images)
    "compute.googleapis.com",           // Global LB + CDN for the web SPA
    "storage.googleapis.com",           // Cloud Storage (files + web buckets)
    "iam.googleapis.com",               // Service accounts + IAM bindings
    "servicenetworking.googleapis.com", // Private Services Access (optional)
    "vpcaccess.googleapis.com",         // Serverless VPC Access (optional)
  ])

  project = var.project_id
  service = each.value

  // Keep APIs enabled on `terraform destroy` — disabling shared APIs could break
  // other workloads in the same project.
  disable_on_destroy = false
}
