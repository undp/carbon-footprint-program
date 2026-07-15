// -----------------------------------------------------------------------------
// api.tf — the API on Cloud Run (v2).
//
// Azure-Bicep counterpart: infra/modules/appService.bicep
//   (App Service Plan + Linux App Service running the container, its managed
//   identity, CORS, and app settings). Cloud Run replaces the App Service; the
//   env parity below matches appService.bicep + docker-compose.prod.yml.
//
// Contract (do not change): the container listens on 8080, exposes GET /health,
// and is stateless.
// -----------------------------------------------------------------------------

// Runtime identity for the API (Azure counterpart: the App Service system-assigned
// managed identity). Referenced by secrets.tf (secretAccessor) and below.
resource "google_service_account" "api" {
  account_id   = "${var.name_prefix}-${var.environment}-api"
  display_name = "Huella Latam API (Cloud Run) SA"
}

// Let the API open the Cloud SQL Auth Proxy socket (mirrors the App Service being
// allowed to reach the Postgres flexible server).
resource "google_project_iam_member" "api_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_cloud_run_v2_service" "api" {
  name     = "${local.name_prefix}-api"
  location = var.region

  // Public ingress — the API is internet-facing like the Azure App Service. The
  // app still enforces JWKS auth; run.invoker below controls network reachability.
  ingress = "INGRESS_TRAFFIC_ALL"

  labels = local.labels

  template {
    service_account = google_service_account.api.email

    scaling {
      min_instance_count = var.api_min_instances
      max_instance_count = var.api_max_instances
    }

    containers {
      image = var.api_image

      // Fixed app contract: listens on 8080.
      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = var.api_cpu
          memory = var.api_memory
        }
      }

      // --- Non-secret env (plain values) — parity with appService.bicep /
      //     docker-compose.prod.yml. ---
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "API_HOST"
        value = "0.0.0.0"
      }
      env {
        name  = "API_PORT"
        value = "8080"
      }
      env {
        name  = "ALLOWED_ORIGIN"
        value = var.allowed_origin
      }
      env {
        name  = "API_ORIGIN"
        value = var.api_origin
      }
      env {
        name  = "AUTH_PROVIDER"
        value = "jwks"
      }
      env {
        name  = "JWKS_ISSUER"
        value = var.jwks_issuer
      }
      env {
        name  = "JWKS_URI"
        value = var.jwks_uri
      }
      env {
        name  = "JWKS_AUDIENCE"
        value = var.jwks_audience
      }
      env {
        name  = "JWKS_REQUIRED_SCOPE"
        value = var.jwks_required_scope
      }
      env {
        name  = "JWKS_SKIP_SCOPE_CHECK"
        value = var.jwks_skip_scope_check
      }
      env {
        name  = "SUPERADMIN_EMAIL"
        value = var.superadmin_email
      }
      env {
        name  = "APP_VERSION"
        value = var.app_version
      }

      // --- Object storage: GCS via S3-interop (STORAGE_PROVIDER=minio). ---
      env {
        name  = "STORAGE_PROVIDER"
        value = "minio"
      }
      env {
        name  = "MINIO_ENDPOINT"
        value = "https://storage.googleapis.com"
      }
      env {
        name  = "MINIO_BUCKET"
        value = google_storage_bucket.files.name
      }
      env {
        name  = "MINIO_REGION"
        value = var.region
      }
      // GCS XML API requires path-style addressing.
      env {
        name  = "MINIO_FORCE_PATH_STYLE"
        value = "true"
      }

      // --- Secrets (Secret Manager) — DATABASE_URL + HMAC creds. ---
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "MINIO_ACCESS_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.minio_access_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "MINIO_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.minio_secret_key.secret_id
            version = "latest"
          }
        }
      }

      // Health probes on GET /health (Azure App Service uses a health-check path;
      // docker-compose uses the same endpoint).
      startup_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        initial_delay_seconds = 10
        period_seconds        = 10
        timeout_seconds       = 5
        failure_threshold     = 6
      }
      liveness_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        period_seconds  = 30
        timeout_seconds = 5
      }

      // Mount the Cloud SQL Auth Proxy socket so DATABASE_URL's
      // host=/cloudsql/<connection_name> resolves.
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    // Built-in Cloud SQL connector: no VPC connector needed on the default path.
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }

    // Optional hardening: route egress through the Serverless VPC Access connector
    // (only when private networking is enabled — see network.tf).
    dynamic "vpc_access" {
      for_each = var.enable_private_networking ? [1] : []
      content {
        connector = one(google_vpc_access_connector.serverless[*].id)
        egress    = "PRIVATE_RANGES_ONLY"
      }
    }
  }

  // Ensure the SA can read the secrets before the revision starts (Cloud Run
  // validates secret access at deploy time). Whole-resource refs are safe.
  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_iam_member.api_database_url,
    google_secret_manager_secret_iam_member.api_minio_access_key,
    google_secret_manager_secret_iam_member.api_minio_secret_key,
    google_project_iam_member.api_cloudsql_client,
  ]
}

// Public invocation, matching the Azure App Service being internet-reachable.
// Guarded so adopters can lock the API down to authenticated callers instead.
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count = var.api_allow_unauthenticated ? 1 : 0

  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
