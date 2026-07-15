// -----------------------------------------------------------------------------
// outputs.tf — values an adopter needs after apply.
//
// Azure-Bicep counterpart: the `output` blocks in infra/main.bicep (frontend /
// api / database / infrastructure objects + the flat outputs the deploy scripts
// consume). Credential-bearing outputs are marked sensitive.
// -----------------------------------------------------------------------------

output "cloud_run_url" {
  description = "Auto-assigned Cloud Run URL of the API."
  value       = google_cloud_run_v2_service.api.uri
}

output "api_url" {
  description = "Public API origin — the custom API domain if api_origin is set, otherwise the Cloud Run URL."
  value       = var.api_origin != "" ? var.api_origin : google_cloud_run_v2_service.api.uri
}

output "lb_ip_address" {
  description = "Reserved anycast IP of the web load balancer. Point your DNS A record at this."
  value       = google_compute_global_address.web.address
}

output "web_url" {
  description = "Public URL of the web SPA — https on the custom domain when set, otherwise http on the LB IP."
  value       = var.custom_domain_web != "" ? "https://${var.custom_domain_web}" : "http://${google_compute_global_address.web.address}"
}

output "artifact_registry_repository" {
  description = "Artifact Registry Docker repo path. Tag/push API images as <this>/api:<tag>."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.api.repository_id}"
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL instance connection name (project:region:instance). Used by the Auth Proxy and in DATABASE_URL."
  value       = google_sql_database_instance.main.connection_name
  sensitive   = true
}

output "gcs_files_bucket" {
  description = "Name of the private files bucket (MINIO_BUCKET)."
  value       = google_storage_bucket.files.name
}

output "gcs_web_bucket" {
  description = "Name of the public web/SPA bucket. Upload dist/ here."
  value       = google_storage_bucket.web.name
}

output "database_url_secret_id" {
  description = "Secret Manager secret id holding the full DATABASE_URL."
  value       = google_secret_manager_secret.database_url.secret_id
}

output "hmac_secret_ids" {
  description = "Secret Manager secret ids for the GCS S3-interop HMAC credentials."
  value = {
    access_key = google_secret_manager_secret.minio_access_key.secret_id
    secret_key = google_secret_manager_secret.minio_secret_key.secret_id
  }
}

output "next_steps" {
  description = "Post-apply manual steps (image build/push, web upload, migrations, auth, DNS)."
  value       = <<-EOT
    Next steps after `terraform apply`:

    1. Build & push the API image to Artifact Registry, then point Cloud Run at it:
         gcloud auth configure-docker ${var.region}-docker.pkg.dev
         docker build -f apps/api/Dockerfile -t ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.api.repository_id}/api:v1 .
         docker push ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.api.repository_id}/api:v1
       Then set api_image to that ref and re-run `terraform apply`
       (or: gcloud run deploy ${google_cloud_run_v2_service.api.name} --image <ref> --region ${var.region}).

    2. Build the web SPA and upload it to the web bucket:
         pnpm --filter web build   # supply VITE_* env; see apps/web/Dockerfile
         gsutil -m rsync -d -r apps/web/dist gs://${google_storage_bucket.web.name}

    3. Run Prisma migrations against Cloud SQL via the Cloud SQL Auth Proxy
       (connection name: `terraform output -raw cloud_sql_connection_name`; see packages/database).

    4. Wire OIDC: set jwks_issuer / jwks_uri / jwks_audience from your IdP and re-apply
       (docs/infrastructure/GenericOidcAuthenticationSetup.md).

    5. Set api_origin to ${google_cloud_run_v2_service.api.uri} (or your custom API domain) and re-apply.

    6. Point DNS for custom_domain_web at the LB IP (${google_compute_global_address.web.address}); managed SSL provisioning takes 15-60 min.
  EOT
}
