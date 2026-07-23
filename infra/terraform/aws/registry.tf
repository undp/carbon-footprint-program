// registry.tf — container registry for the API image.
//
// Mirrors infra/modules/acr.bicep (Azure Container Registry). ECR is the AWS
// equivalent. Push the apps/api image here, then set var.api_image to the
// resulting repo:tag (see README).

resource "aws_ecr_repository" "api" {
  name                 = "${local.name_prefix}-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${local.name_prefix}-api"
  }
}

// Expire untagged images after 14 days to keep the registry (and its storage
// bill) tidy. Tagged images are retained.
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than 14 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 14
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
