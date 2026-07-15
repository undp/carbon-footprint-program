// frontend.tf — static SPA hosting + CDN.
//
// Mirrors infra/modules/staticWebApp.bicep (Azure Static Web App) and
// infra/modules/frontDoor.bicep (Azure Front Door + WAF). On AWS the built
// React/Vite bundle lives in a private S3 bucket served through CloudFront via
// an Origin Access Control; the optional WAFv2 Web ACL mirrors Front Door's
// managed rules + rate limit. Building and uploading dist/ is a manual step
// (see README) — Terraform only provisions the hosting.

// ---------------------------------------------------------------------------
// Site bucket (private; only CloudFront can read it)
// ---------------------------------------------------------------------------

resource "aws_s3_bucket" "web" {
  bucket = local.web_bucket_name

  tags = {
    Name = "${local.name_prefix}-web"
  }
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket = aws_s3_bucket.web.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

// ---------------------------------------------------------------------------
// TLS certificate for a custom domain (CloudFront requires it in us-east-1).
// Created only when a custom web domain is set. The adopter must complete DNS
// validation (records are emitted as outputs) before CloudFront can finish —
// see the README "two-phase apply" note.
// ---------------------------------------------------------------------------

resource "aws_acm_certificate" "web" {
  count             = var.custom_domain_web != "" ? 1 : 0
  provider          = aws.us_east_1
  domain_name       = var.custom_domain_web
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${local.name_prefix}-web-cert"
  }
}

// ---------------------------------------------------------------------------
// CloudFront distribution
// ---------------------------------------------------------------------------

resource "aws_cloudfront_origin_access_control" "web" {
  name                              = "${local.name_prefix}-web-oac"
  description                       = "OAC for the ${local.name_prefix} SPA bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "web" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "${local.name_prefix} web SPA"

  // NA + EU edge locations only — cheapest tier that still fronts the SPA well.
  price_class = "PriceClass_100"

  // Bind the custom domain as an alias when configured.
  aliases = compact([var.custom_domain_web])

  origin {
    domain_name              = aws_s3_bucket.web.bucket_regional_domain_name
    origin_id                = "s3-web"
    origin_access_control_id = aws_cloudfront_origin_access_control.web.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-web"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    // AWS managed "CachingOptimized" cache policy (static-asset friendly).
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  // SPA routing: S3 returns 403/404 for client-side routes; rewrite both to
  // index.html with a 200 so the React router can take over. Mirrors the SPA
  // fallback behaviour of Azure Static Web Apps.
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  // Default CloudFront cert unless a custom domain (+ its us-east-1 ACM cert)
  // is configured. minimum_protocol_version must stay "TLSv1" with the default
  // cert (AWS rejects a stronger floor there); with a real cert we require 1.2.
  viewer_certificate {
    cloudfront_default_certificate = var.custom_domain_web == "" ? true : null
    acm_certificate_arn            = var.custom_domain_web != "" ? aws_acm_certificate.web[0].arn : null
    ssl_support_method             = var.custom_domain_web != "" ? "sni-only" : null
    minimum_protocol_version       = var.custom_domain_web != "" ? "TLSv1.2_2021" : "TLSv1"
  }

  // Attach the WAF Web ACL when enabled (must be a CLOUDFRONT-scoped ACL ARN).
  web_acl_id = var.enable_waf ? aws_wafv2_web_acl.cloudfront[0].arn : null

  tags = {
    Name = "${local.name_prefix}-web"
  }
}

// Bucket policy: allow this distribution (via OAC) to read objects. Scoped with
// the AWS:SourceArn condition so only this specific distribution can read.
data "aws_iam_policy_document" "web_bucket" {
  statement {
    sid       = "AllowCloudFrontOAC"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.web.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.web.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "web" {
  bucket = aws_s3_bucket.web.id
  policy = data.aws_iam_policy_document.web_bucket.json
}

// ---------------------------------------------------------------------------
// Optional WAFv2 Web ACL (CLOUDFRONT scope -> must be in us-east-1).
// Mirrors frontDoor.bicep: AWS managed common rule set + a rate-based rule
// standing in for Front Door's RateLimitRule (100 req/min per IP there).
// ---------------------------------------------------------------------------

resource "aws_wafv2_web_acl" "cloudfront" {
  count    = var.enable_waf ? 1 : 0
  provider = aws.us_east_1
  name     = "${local.name_prefix}-web-acl"
  scope    = "CLOUDFRONT"

  default_action {
    allow {}
  }

  // AWS managed baseline (OWASP-style common protections).
  rule {
    name     = "AWSManagedCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-common-rules"
      sampled_requests_enabled   = true
    }
  }

  // Rate limit per source IP. WAF evaluates over a rolling 5-minute window, so
  // 1000 here ~ 200 req/min sustained — tune to match Front Door's 100/min if
  // you want a stricter mirror.
  rule {
    name     = "RateLimit"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name_prefix}-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name_prefix}-web-acl"
    sampled_requests_enabled   = true
  }

  tags = {
    Name = "${local.name_prefix}-web-acl"
  }
}
