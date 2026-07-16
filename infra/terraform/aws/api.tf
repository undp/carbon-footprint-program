// api.tf — the API service.
//
// Mirrors infra/modules/appService.bicep (Azure App Service running the
// apps/api container). On AWS the API runs as an ECS Fargate service in the
// private subnets, fronted by an Application Load Balancer in the public
// subnets. The env-var contract matches appService.bicep + docker-compose.prod.yml:
// non-secret values go in `environment`, credential-bearing values are injected
// from Secrets Manager via `secrets` (valueFrom).

// ---------------------------------------------------------------------------
// Cluster + logs
// ---------------------------------------------------------------------------

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  // Container Insights is left off to avoid always-on CloudWatch cost; adopters
  // wanting deeper observability can flip this to "enabled".
  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  tags = {
    Name = "${local.name_prefix}-cluster"
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name_prefix}-api"
  retention_in_days = 30

  tags = {
    Name = "${local.name_prefix}-api"
  }
}

// ---------------------------------------------------------------------------
// IAM roles
// ---------------------------------------------------------------------------

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

// Execution role — used by the ECS agent (not the app) to pull the image, write
// logs, and resolve the Secrets Manager secrets referenced by `secrets`.
resource "aws_iam_role" "ecs_execution" {
  name               = "${local.name_prefix}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

// Allow the execution role to read exactly the secret injected into the task.
// Only DATABASE_URL is a Secrets Manager secret now — object storage is keyless
// (the app reaches S3 via the task role), so there is no MinIO key to read.
resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "${local.name_prefix}-ecs-execution-secrets"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [aws_secretsmanager_secret.database_url.arn]
      }
    ]
  })
}

// Task role — assumed by the application process. The API talks to S3 KEYLESS:
// the storage adapter omits explicit credentials, so the AWS SDK default chain
// picks up this role. Its least-privilege S3 policy (scoped to the files
// bucket) is attached in storage.tf, next to the bucket it grants.
resource "aws_iam_role" "ecs_task" {
  name               = "${local.name_prefix}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

// ---------------------------------------------------------------------------
// Task definition
// ---------------------------------------------------------------------------

resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name_prefix}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = var.api_image
      essential = true

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      // Non-secret environment (parity with appService.bicep appSettings).
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "API_HOST", value = "0.0.0.0" },
        { name = "API_PORT", value = "8080" },
        { name = "ALLOWED_ORIGIN", value = var.allowed_origin },
        { name = "API_ORIGIN", value = var.api_origin },
        { name = "AUTH_PROVIDER", value = "jwks" },
        { name = "JWKS_ISSUER", value = var.jwks_issuer },
        { name = "JWKS_URI", value = var.jwks_uri },
        { name = "JWKS_AUDIENCE", value = var.jwks_audience },
        { name = "JWKS_REQUIRED_SCOPE", value = var.jwks_required_scope },
        { name = "JWKS_SKIP_SCOPE_CHECK", value = var.jwks_skip_scope_check },
        { name = "SUPERADMIN_EMAIL", value = var.superadmin_email },
        { name = "STORAGE_PROVIDER", value = "minio" },
        { name = "MINIO_ENDPOINT", value = "https://s3.${var.region}.amazonaws.com" },
        { name = "MINIO_BUCKET", value = aws_s3_bucket.files.bucket },
        { name = "MINIO_REGION", value = var.region },
        { name = "MINIO_FORCE_PATH_STYLE", value = "false" },
        { name = "APP_VERSION", value = var.app_version }
      ]

      // Credential-bearing values injected from Secrets Manager (never plaintext).
      // Object storage is keyless (S3 via the task role), so no MINIO_* secret
      // is injected — only DATABASE_URL.
      secrets = [
        { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.database_url.arn }
      ]

      // Same probe as apps/api/Dockerfile HEALTHCHECK (curl is present in the image).
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 40
      }

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "api"
        }
      }
    }
  ])

  tags = {
    Name = "${local.name_prefix}-api"
  }
}

// ---------------------------------------------------------------------------
// Load balancer (public entry point for the API)
// ---------------------------------------------------------------------------

resource "aws_lb" "api" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "${local.name_prefix}-alb"
  }
}

// IP target group — Fargate awsvpc tasks register by ENI IP. Health check hits
// the same GET /health endpoint the container probe uses.
resource "aws_lb_target_group" "api" {
  name        = "${local.name_prefix}-api-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name = "${local.name_prefix}-api-tg"
  }
}

// HTTP :80 — when a cert is configured, redirect to HTTPS; otherwise forward
// directly to the target group. Exactly one of these two exists (count).
resource "aws_lb_listener" "http_redirect" {
  count             = var.acm_certificate_arn_api != "" ? 1 : 0
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "http_forward" {
  count             = var.acm_certificate_arn_api != "" ? 0 : 1
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

// HTTPS :443 — only when a regional ACM cert ARN is supplied.
resource "aws_lb_listener" "https" {
  count             = var.acm_certificate_arn_api != "" ? 1 : 0
  load_balancer_arn = aws_lb.api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn_api

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

// ---------------------------------------------------------------------------
// ECS service
// ---------------------------------------------------------------------------

resource "aws_ecs_service" "api" {
  name            = "${local.name_prefix}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  // Give the container time to boot before ALB health checks can drain it.
  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false // egress is via the NAT gateway
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  // The listener must exist before the service can register targets.
  depends_on = [
    aws_lb_listener.http_forward,
    aws_lb_listener.http_redirect,
    aws_lb_listener.https
  ]

  tags = {
    Name = "${local.name_prefix}-api"
  }
}
