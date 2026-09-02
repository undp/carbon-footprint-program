// variables.tf — all adopter-facing inputs.
//
// This is the AWS analogue of infra/params/main.<env>.bicepparam plus the
// per-module Bicep params. Everything a deployer must or may set lives here;
// terraform.tfvars.example shows realistic values.

// ---------------------------------------------------------------------------
// Core / naming
// ---------------------------------------------------------------------------

variable "region" {
  description = "AWS region for all regional resources (VPC, ECS, RDS, ALB, S3). CloudFront cert + WAF always go to us-east-1 regardless of this value."
  type        = string
  default     = "us-east-1"
}

variable "name_prefix" {
  description = "Short prefix for resource names. Combined with environment as \"<name_prefix>-<environment>\"."
  type        = string
  default     = "huella"
}

variable "environment" {
  description = "Deployment environment name; used in resource names and the Environment tag."
  type        = string
  default     = "prod"
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for the VPC. Split into az_count public + az_count private /24 subnets."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of Availability Zones to spread subnets across (min 2 for RDS subnet group / ALB)."
  type        = number
  default     = 2
}

// ---------------------------------------------------------------------------
// Database — mirrors infra/modules/postgres.bicep (Azure DB for PostgreSQL
// Flexible Server). RDS for PostgreSQL is the AWS managed equivalent.
// ---------------------------------------------------------------------------

variable "postgres_version" {
  description = "RDS PostgreSQL major version. The Azure reference (postgres.bicep) pins 18; RDS lags Azure on new majors, so 17 is the safe default — bump to 18 if your region's RDS offers it."
  type        = string
  default     = "17"
}

variable "db_instance_class" {
  description = "RDS instance class. db.t4g.medium (Graviton, burstable) is the low-cost reference default, analogous to the Azure Burstable tier."
  type        = string
  default     = "db.t4g.medium"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GiB (gp3)."
  type        = number
  default     = 32
}

variable "db_name" {
  description = "Initial database name created on the instance."
  type        = string
  default     = "huella_latam"
}

variable "db_username" {
  description = "RDS master (admin) username."
  type        = string
  default     = "pgadmin"
}

variable "db_backup_retention_days" {
  description = "Automated backup retention in days."
  type        = number
  default     = 7
}

variable "db_multi_az" {
  description = "Deploy RDS across two AZs for HA. Doubles DB cost — off by default; the Azure reference also runs highAvailability Disabled."
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Block accidental deletion of the RDS instance. Leave false for throwaway/reference deploys; set true for anything holding real data."
  type        = bool
  default     = false
}

variable "db_skip_final_snapshot" {
  description = "Skip the final snapshot on destroy. true keeps the reference stack cheap/clean to tear down; set false in production."
  type        = bool
  default     = true
}

// ---------------------------------------------------------------------------
// API container — mirrors infra/modules/appService.bicep (App Service) running
// the apps/api image. Here it runs on ECS Fargate behind an ALB.
// ---------------------------------------------------------------------------

variable "api_image" {
  description = "Full ECR image reference (repo:tag) for the API container. Placeholder default — override once you have pushed an image (see README). Terraform also creates the ECR repo you push to."
  type        = string
  default     = "public.ecr.aws/docker/library/busybox:latest"
}

variable "api_cpu" {
  description = "Fargate task CPU units (256/512/1024/...). Must form a valid pair with api_memory."
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Fargate task memory in MiB. Must form a valid pair with api_cpu."
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Number of API tasks to run. The API is stateless and horizontally scalable."
  type        = number
  default     = 1
}

// ----- API environment (parity with appService.bicep appSettings + docker-compose.prod.yml) -----

variable "allowed_origin" {
  description = "Browser origin of the web app, e.g. https://app.example.org. Sets Fastify ALLOWED_ORIGIN and the S3 CORS allow-list (mirrors the Bicep `allowedOrigin`)."
  type        = string
  default     = ""
}

variable "dev_allowed_origin" {
  description = "Optional extra origin allowed to call S3 directly (e.g. http://localhost:5173 for local dev). Mirrors storage.bicep `devAllowedOrigin`. Empty = none."
  type        = string
  default     = ""
}

variable "api_origin" {
  description = "Public origin of the API itself (ALB or custom domain URL), needed only if the MinIO storage relay is enabled. Empty = derive nothing."
  type        = string
  default     = ""
}

variable "jwks_issuer" {
  description = "OIDC token issuer (BYO IdP). May be empty at first apply and filled in once your IdP is configured. See docs/infrastructure/GenericOidcAuthenticationSetup.md."
  type        = string
  default     = ""
}

variable "jwks_uri" {
  description = "OIDC JWKS (public keys) endpoint of your IdP."
  type        = string
  default     = ""
}

variable "jwks_audience" {
  description = "Expected token audience (API client/app id from your IdP)."
  type        = string
  default     = ""
}

variable "jwks_required_scope" {
  description = "Optional OAuth scope the API requires on incoming tokens. Empty = none."
  type        = string
  default     = ""
}

variable "jwks_skip_scope_check" {
  description = "Set to \"true\" to skip the scope check entirely (some IdPs do not issue scopes). Empty/false = enforce."
  type        = string
  default     = ""
}

variable "superadmin_email" {
  description = "Optional bootstrap superadmin email granted elevated access on first login."
  type        = string
  default     = ""
}

variable "app_version" {
  description = "Value surfaced as APP_VERSION on the API (shown in /health and logs)."
  type        = string
  default     = "prod"
}

// ---------------------------------------------------------------------------
// Custom domains / TLS
// ---------------------------------------------------------------------------

variable "custom_domain_api" {
  description = "Custom domain for the API (e.g. api.example.org). Empty = use the ALB DNS name. You point this DNS record at the ALB yourself."
  type        = string
  default     = ""
}

variable "custom_domain_web" {
  description = "Custom domain for the web app (e.g. app.example.org). Empty = use the CloudFront domain. Requires an ACM cert in us-east-1 (created here) validated via DNS."
  type        = string
  default     = ""
}

variable "acm_certificate_arn_api" {
  description = "ARN of a REGIONAL ACM certificate (same region as the stack) for the ALB HTTPS listener. Empty = ALB serves plain HTTP only. The CloudFront cert is separate (us-east-1) and created from custom_domain_web."
  type        = string
  default     = ""
}

// ---------------------------------------------------------------------------
// Edge protection
// ---------------------------------------------------------------------------

variable "enable_waf" {
  description = "Attach a WAFv2 Web ACL (AWS managed common rules + rate limit) to the CloudFront distribution. Mirrors the optional Azure Front Door WAF. Off by default (adds cost)."
  type        = bool
  default     = false
}
