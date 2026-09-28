// -----------------------------------------------------------------------------
// network.tf — OPTIONAL private-networking hardening path.
//
// Azure-Bicep counterpart: none directly. The Bicep reference reaches PostgreSQL
// over its public endpoint guarded by firewall rules (infra/modules/postgres.bicep
// `firewallRules`). The default path here is even simpler and more secure: Cloud
// SQL keeps a public IP with NO authorized networks, so it is unreachable from
// the internet, and Cloud Run connects only through the built-in Cloud SQL Auth
// Proxy (unix socket) — see api.tf. No VPC or connector is required.
//
// This file is a NO-OP unless `enable_private_networking = true`. When enabled it
// provisions the plumbing for a fully private data path:
//   - a VPC + regional subnet,
//   - Private Services Access (VPC peering range) so Cloud SQL gets a private IP,
//   - a Serverless VPC Access connector so Cloud Run can egress into the VPC.
// database.tf and api.tf pick these up conditionally (private_network / vpc_access).
// -----------------------------------------------------------------------------

// Dedicated VPC for the private data path.
resource "google_compute_network" "vpc" {
  count = var.enable_private_networking ? 1 : 0

  name                    = "${local.name_prefix}-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

// Regional subnet hosting workloads that need VPC connectivity.
resource "google_compute_subnetwork" "subnet" {
  count = var.enable_private_networking ? 1 : 0

  name          = "${local.name_prefix}-subnet"
  ip_cidr_range = "10.10.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc[0].id
}

// Reserved address range for Private Services Access (the peering with Google's
// service producer network that backs Cloud SQL private IPs).
resource "google_compute_global_address" "private_ip" {
  count = var.enable_private_networking ? 1 : 0

  name          = "${local.name_prefix}-priv-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc[0].id
}

// The peering itself: lets Cloud SQL allocate a private IP inside the VPC.
resource "google_service_networking_connection" "private_vpc" {
  count = var.enable_private_networking ? 1 : 0

  network                 = google_compute_network.vpc[0].id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip[0].name]

  depends_on = [google_project_service.apis]
}

// Serverless VPC Access connector: the bridge that lets Cloud Run reach private
// IPs inside the VPC (Cloud Run is serverless and has no VPC presence by default).
resource "google_vpc_access_connector" "serverless" {
  count = var.enable_private_networking ? 1 : 0

  name          = "${local.name_prefix}-vpc-conn"
  region        = var.region
  network       = google_compute_network.vpc[0].name
  ip_cidr_range = "10.8.0.0/28"

  depends_on = [google_project_service.apis]
}
