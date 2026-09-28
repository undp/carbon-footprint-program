// -----------------------------------------------------------------------------
// frontend.tf — static web SPA bucket + global HTTPS load balancer with CDN.
//
// Azure-Bicep counterpart: infra/modules/staticWebApp.bicep (SPA hosting) and
// infra/modules/frontDoor.bicep (global CDN/edge + optional WAF). Terraform does
// NOT build or upload the SPA — that `dist/` build+upload is a documented manual
// step (see README), matching how the Azure reference leaves the SWA content to
// CI. This file only provisions the hosting + edge.
// -----------------------------------------------------------------------------

// --------- Bucket that serves the built SPA (dist/) ---------
resource "google_storage_bucket" "web" {
  name     = local.web_bucket_name
  location = var.region

  uniform_bucket_level_access = true

  // SPA routing: serve index.html for both the root and unknown paths so client
  // side routes (e.g. /organizations/123) resolve to the app shell.
  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }

  // NOTE: no `public_access_prevention = "enforced"` here (unlike the files
  // bucket). A Cloud CDN backend bucket fetches objects anonymously, so the SPA
  // assets must be publicly readable — see the allUsers binding below.
  labels = local.labels

  depends_on = [google_project_service.apis]
}

// These are public, static SPA assets (JS/CSS/HTML) — intentionally world
// readable so the load balancer's backend bucket can serve them.
resource "google_storage_bucket_iam_member" "web_public_read" {
  bucket = google_storage_bucket.web.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

// --------- Global external HTTPS load balancer + Cloud CDN ---------
// (Azure Front Door counterpart: profile + endpoint + origin + route + WAF.)

// Reserved anycast IP for the load balancer. Point your DNS A record here.
resource "google_compute_global_address" "web" {
  name = "${local.name_prefix}-web-ip"
}

// Backend bucket with CDN enabled (Front Door origin + caching counterpart).
resource "google_compute_backend_bucket" "web" {
  name        = "${local.name_prefix}-web-backend"
  bucket_name = google_storage_bucket.web.name
  enable_cdn  = true

  // Cloud Armor on a backend BUCKET must be an EDGE security policy (regular
  // backend-service policies do not apply to buckets). Attached only when
  // enable_cloud_armor is true. See the policy resource at the bottom of the file.
  edge_security_policy = var.enable_cloud_armor ? one(google_compute_security_policy.web_edge[*].id) : null
}

// Route everything to the SPA bucket (single-origin, like the Front Door route).
resource "google_compute_url_map" "web" {
  name            = "${local.name_prefix}-web-urlmap"
  default_service = google_compute_backend_bucket.web.id
}

// --- HTTP (port 80): always provisioned so the LB is reachable via IP even
//     without a custom domain (a managed cert requires a domain). ---
resource "google_compute_target_http_proxy" "web" {
  name    = "${local.name_prefix}-web-http-proxy"
  url_map = google_compute_url_map.web.id
}

resource "google_compute_global_forwarding_rule" "web_http" {
  name                  = "${local.name_prefix}-web-http-fr"
  target                = google_compute_target_http_proxy.web.id
  ip_address            = google_compute_global_address.web.id
  port_range            = "80"
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

// --- HTTPS (port 443): only when a custom domain is set, because a Google
//     managed SSL certificate is issued per domain. ---
resource "google_compute_managed_ssl_certificate" "web" {
  count = var.custom_domain_web != "" ? 1 : 0

  name = "${local.name_prefix}-web-cert"
  managed {
    domains = [var.custom_domain_web]
  }
}

resource "google_compute_target_https_proxy" "web" {
  count = var.custom_domain_web != "" ? 1 : 0

  name             = "${local.name_prefix}-web-https-proxy"
  url_map          = google_compute_url_map.web.id
  ssl_certificates = [google_compute_managed_ssl_certificate.web[0].id]
}

resource "google_compute_global_forwarding_rule" "web_https" {
  count = var.custom_domain_web != "" ? 1 : 0

  name                  = "${local.name_prefix}-web-https-fr"
  target                = google_compute_target_https_proxy.web[0].id
  ip_address            = google_compute_global_address.web.id
  port_range            = "443"
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

// --------- Optional Cloud Armor (EDGE) policy ---------
// Front Door WAF counterpart (infra/modules/frontDoor.bicep). Backend buckets
// only accept EDGE-tier policies, which support a limited rule set (no rate
// limiting / managed rule sets — those need a backend SERVICE). This reference
// ships a permissive default; adopters extend `rule` blocks as needed.
resource "google_compute_security_policy" "web_edge" {
  count = var.enable_cloud_armor ? 1 : 0

  name = "${local.name_prefix}-web-edge"
  type = "CLOUD_ARMOR_EDGE"

  rule {
    action      = "allow"
    priority    = 2147483647
    description = "Default allow rule"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}
