// versions.tf — Terraform + provider configuration.
//
// AWS has no direct equivalent of the Azure "subscription/resource group +
// az deployment" model that infra/main.bicep targets. Here the whole stack is
// a single root module applied against one account/region. A second, aliased
// provider pins us-east-1 because CloudFront ACM certificates and CLOUDFRONT-
// scoped WAFv2 Web ACLs MUST live in us-east-1 regardless of the stack region.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

// Primary provider — every regional resource (VPC, ECS, RDS, ALB, S3, ...).
provider "aws" {
  region = var.region

  // Mirrors the `tags` object threaded through every Bicep module.
  default_tags {
    tags = {
      Project     = "undp-huella-latam"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Component   = "huella-latam"
    }
  }
}

// us-east-1 provider — REQUIRED for the CloudFront ACM certificate and the
// CLOUDFRONT-scoped WAFv2 Web ACL, both of which are global services that AWS
// only manages out of us-east-1. All other resources use the primary provider.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "undp-huella-latam"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Component   = "huella-latam"
    }
  }
}
