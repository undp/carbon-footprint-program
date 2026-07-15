// outputs.tf — everything an adopter needs after apply.
//
// Analogue of the flat outputs at the bottom of infra/main.bicep (hostnames,
// resource names, and the values the deploy scripts consume).

output "alb_dns_name" {
  description = "Public DNS name of the API load balancer. Point custom_domain_api at this (CNAME/ALIAS)."
  value       = aws_lb.api.dns_name
}

output "api_url" {
  description = "Public URL of the API (custom domain if set, else the ALB — https when a cert is configured, otherwise http)."
  value = (
    var.custom_domain_api != "" ? "https://${var.custom_domain_api}" :
    var.acm_certificate_arn_api != "" ? "https://${aws_lb.api.dns_name}" :
    "http://${aws_lb.api.dns_name}"
  )
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain (e.g. dxxxx.cloudfront.net). Point custom_domain_web at this."
  value       = aws_cloudfront_distribution.web.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution id (used for cache invalidations after a web deploy)."
  value       = aws_cloudfront_distribution.web.id
}

output "web_url" {
  description = "Public URL of the web app (custom domain if set, else the CloudFront domain)."
  value       = var.custom_domain_web != "" ? "https://${var.custom_domain_web}" : "https://${aws_cloudfront_distribution.web.domain_name}"
}

output "ecr_repository_url" {
  description = "ECR repository URL to push the API image to. Use as the base of var.api_image."
  value       = aws_ecr_repository.api.repository_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (host:port)."
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "s3_files_bucket" {
  description = "Name of the S3 bucket holding user file uploads (MINIO_BUCKET)."
  value       = aws_s3_bucket.files.bucket
}

output "s3_web_bucket" {
  description = "Name of the S3 bucket the built SPA (dist/) is uploaded to."
  value       = aws_s3_bucket.web.bucket
}

output "database_url_secret_arn" {
  description = "Secrets Manager ARN holding the full DATABASE_URL (read it to run migrations from your machine)."
  value       = aws_secretsmanager_secret.database_url.arn
}

output "minio_key_secret_arns" {
  description = "Secrets Manager ARNs for the S3 access key id and secret key used by the API storage adapter."
  value = {
    access_key = aws_secretsmanager_secret.minio_access_key.arn
    secret_key = aws_secretsmanager_secret.minio_secret_key.arn
  }
}

output "web_acm_validation_records" {
  description = "DNS validation records for the CloudFront ACM certificate (empty unless custom_domain_web is set). Create these CNAMEs, wait for the cert to reach ISSUED, then apply again (two-phase apply)."
  value       = var.custom_domain_web != "" ? aws_acm_certificate.web[0].domain_validation_options : []
}

output "next_steps" {
  description = "Post-apply checklist: push the image, deploy the web bundle, run migrations, wire OIDC."
  value       = <<-EOT
    Next steps (details in infra/terraform/aws/README.md):

    1. Build & push the API image to ECR, then set var.api_image and re-apply:
         aws ecr get-login-password --region ${var.region} \
           | docker login --username AWS --password-stdin ${aws_ecr_repository.api.repository_url}
         docker build -f apps/api/Dockerfile -t ${aws_ecr_repository.api.repository_url}:v1 .
         docker push ${aws_ecr_repository.api.repository_url}:v1
         # set api_image = "${aws_ecr_repository.api.repository_url}:v1" then: terraform apply
         # (or force a redeploy of the existing task def:)
         aws ecs update-service --cluster ${aws_ecs_cluster.main.name} \
           --service ${aws_ecs_service.api.name} --force-new-deployment --region ${var.region}

    2. Build the web SPA and upload it to the site bucket, then invalidate the CDN:
         pnpm --filter web build   # pass the VITE_* build args (see README)
         aws s3 sync apps/web/dist/ s3://${aws_s3_bucket.web.bucket}/ --delete
         aws cloudfront create-invalidation \
           --distribution-id ${aws_cloudfront_distribution.web.id} --paths "/*"

    3. Run Prisma migrations against RDS (DATABASE_URL lives in Secrets Manager):
         # fetch it: aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.database_url.arn}
         DATABASE_URL="<value>" pnpm --filter @repo/database prod:deploy

    4. Wire your OIDC IdP: set jwks_issuer / jwks_uri / jwks_audience (and the web
       VITE_OIDC_* build args) then re-apply. See docs/infrastructure/GenericOidcAuthenticationSetup.md.
  EOT
}
