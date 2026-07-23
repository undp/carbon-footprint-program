// -----------------------------------------------------------------------------
// registry.tf — Artifact Registry Docker repository for the API image.
//
// Azure-Bicep counterpart: infra/modules/acr.bicep
//   (Microsoft.ContainerRegistry/registries).
//
// The API image built from apps/api/Dockerfile is pushed here, then referenced
// by Cloud Run via var.api_image. See the README for the build/push commands.
// -----------------------------------------------------------------------------

resource "google_artifact_registry_repository" "api" {
  location      = var.region
  repository_id = "${local.name_prefix}-api"
  description   = "Container images for the Huella Latam API"
  format        = "DOCKER"
  labels        = local.labels

  depends_on = [google_project_service.apis]
}
