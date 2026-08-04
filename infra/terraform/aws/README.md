# Huella Latam — AWS Terraform reference stack

A deployable, adopter-facing reference for running Huella Latam on AWS. It
mirrors the Azure Bicep reference under [`infra/`](../../) so non-Azure adopters
have a correct starting point. It is intentionally readable and minimal — copy
it, adjust the variables, and grow it into your production stack.

**What it provisions**

- **VPC** — public + private subnets across AZs, one NAT gateway, security groups.
- **RDS for PostgreSQL** — private, encrypted, TLS-required.
- **ECS Fargate + ALB** — the `apps/api` container (port 8080, `GET /health`),
  behind an Application Load Balancer.
- **S3 + CloudFront** — the static SPA bucket fronted by a CDN, plus a second S3
  bucket for user file uploads (accessed by the API keyless, via the ECS task role).
- **ECR** — registry for the API image.
- **Secrets Manager** — `DATABASE_URL` (object storage is keyless, so there is no S3 key to store).
- **Optional WAFv2** — managed common rules + a rate limit on CloudFront.

## Azure → AWS mapping

| Concern              | Azure (Bicep)                                         | AWS (this stack)                        |
| -------------------- | ----------------------------------------------------- | --------------------------------------- |
| API compute          | App Service (`appService.bicep`)                      | ECS Fargate service + ALB (`api.tf`)    |
| Database             | PostgreSQL Flexible Server (`postgres.bicep`)         | RDS for PostgreSQL (`database.tf`)      |
| File storage         | Storage Account + `files` container (`storage.bicep`) | S3 bucket (`storage.tf`)                |
| Web hosting          | Static Web App (`staticWebApp.bicep`)                 | S3 + CloudFront (`frontend.tf`)         |
| CDN / WAF            | Front Door + WAF (`frontDoor.bicep`)                  | CloudFront + WAFv2 (`frontend.tf`)      |
| Container registry   | ACR (`acr.bicep`)                                     | ECR (`registry.tf`)                     |
| Secrets              | Key Vault (`keyVault.bicep`)                          | Secrets Manager (`secrets.tf`)          |
| Network isolation    | Platform + PG firewall rules                          | VPC + security groups (`network.tf`)    |
| Identity for storage | Managed Identity (RBAC)                               | ECS task role (keyless, see note below) |

## Prerequisites

- **Terraform** >= 1.5.0
- **AWS CLI** configured with credentials for the target account (`aws sts get-caller-identity` should work)
- **Docker** (to build and push the API image)
- **pnpm** + Node (to build the web SPA and run DB migrations), per the repo root

## 1. Configure and apply

```bash
cd infra/terraform/aws
cp terraform.tfvars.example terraform.tfvars   # edit it

terraform init
terraform plan
terraform apply
```

On the first apply the API runs a placeholder image (`api_image` default) — that
is fine; you replace it in step 2. After apply, read the outputs:

```bash
terraform output          # api_url, web_url, ecr_repository_url, next_steps, ...
```

> **Chicken-and-egg:** `allowed_origin` should be the web app's final origin. If
> you are not using a custom domain, apply once, copy `web_url` from the output
> into `allowed_origin`, and apply again.

> **⚠️ HTTP is eval-only.** With the shipped defaults (no `acm_certificate_arn_api`),
> the ALB serves the API over **plain HTTP** — OIDC bearer tokens would travel in
> cleartext. For anything past a throwaway evaluation, set `custom_domain_api` +
> `acm_certificate_arn_api` (a regional ACM cert) so the ALB redirects HTTP→HTTPS
> (see [Custom domains & certificates](#custom-domains--certificates) below). The
> web tier is already HTTPS via CloudFront's `redirect-to-https`.

## 2. Build & push the API image, then redeploy

```bash
ECR_URL=$(terraform output -raw ecr_repository_url)
REGION=$(terraform output -raw api_url >/dev/null; echo us-east-1)  # or your region

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ECR_URL"

# from the repo root (build context = repo root, per docker-compose.prod.yml)
docker build -f apps/api/Dockerfile -t "$ECR_URL:v1" .
docker push "$ECR_URL:v1"
```

> **Tags are immutable.** The ECR repo is created with
> `image_tag_mutability = "IMMUTABLE"`, so a tag cannot be overwritten. Push a
> **fresh tag** for each build (`:v2`, a git SHA, …) rather than re-pushing
> `:v1`. The redeploy path below uses `--force-new-deployment` and does not
> re-push a tag.

Then either set `api_image = "<ECR_URL>:v1"` in `terraform.tfvars` and
`terraform apply`, or force the existing service to redeploy:

```bash
aws ecs update-service \
  --cluster "$(terraform output -raw ... )"  # see the next_steps output for the exact command
```

The `next_steps` output prints the exact `docker` / `aws ecs update-service`
commands with your real values filled in.

## 3. Build & deploy the web SPA

The web build inlines its config at build time (Vite `VITE_*` args — see
[`apps/web/Dockerfile`](../../../apps/web/Dockerfile) for the full list). Build
with your values, then sync `dist/` to the site bucket and invalidate the CDN:

```bash
# from the repo root — pass the same VITE_* args the Dockerfile documents:
VITE_API_BASE_URL="$(cd infra/terraform/aws && terraform output -raw api_url)" \
VITE_OIDC_ISSUER="https://idp.example.org/realms/huella" \
VITE_OIDC_CLIENT_ID="huella-web" \
VITE_OIDC_SCOPES="openid profile email" \
VITE_OIDC_REDIRECT_URI="https://app.example.org/auth/callback" \
  pnpm --filter web build

WEB_BUCKET=$(cd infra/terraform/aws && terraform output -raw s3_web_bucket)
DIST_ID=$(cd infra/terraform/aws && terraform output -raw cloudfront_distribution_id)

aws s3 sync apps/web/dist/ "s3://$WEB_BUCKET/" --delete
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```

Also set `STORAGE_ORIGIN` (the browser-facing S3 origin,
`https://s3.<region>.amazonaws.com`) as a build arg if you rely on browser-direct
uploads — the nginx CSP in the Docker image needs it, and the Vite build reads
the OIDC/storage origins from these args.

## 4. Run database migrations

Migrations are Prisma (`packages/database`, the `@repo/database` package). Run
them against RDS from a host that can reach the database (the DB is private —
run from a bastion/VPN, or temporarily allow your IP; do not leave RDS public).

```bash
# DATABASE_URL is stored in Secrets Manager:
SECRET_ARN=$(cd infra/terraform/aws && terraform output -raw database_url_secret_arn)
DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ARN" \
  --query SecretString --output text)

DATABASE_URL="$DATABASE_URL" pnpm --filter @repo/database prod:deploy
```

`prod:deploy` runs `prisma migrate deploy` (see `packages/database/package.json`).

## 5. Wire OIDC / authentication

Auth is bring-your-own OIDC (`AUTH_PROVIDER=jwks`). This stack does **not**
provision an IdP. Configure your IdP (Keycloak, Entra, Auth0, ...) then set:

- API (Terraform vars, re-apply): `jwks_issuer`, `jwks_uri`, `jwks_audience`
- Web (build args, rebuild + re-sync): `VITE_OIDC_ISSUER`, `VITE_OIDC_CLIENT_ID`,
  `VITE_OIDC_SCOPES`, `VITE_OIDC_REDIRECT_URI`

Full walkthrough:
[`docs/infrastructure/GenericOidcAuthenticationSetup.md`](../../../docs/infrastructure/GenericOidcAuthenticationSetup.md).

## Custom domains & certificates

- **API (ALB):** set `custom_domain_api` and provide `acm_certificate_arn_api` — a
  **regional** ACM cert in the same region as the stack. Point the DNS record at
  `alb_dns_name`. Without a cert the ALB serves plain HTTP only.
- **Web (CloudFront):** set `custom_domain_web`. Terraform creates an ACM cert in
  **us-east-1** (CloudFront requires it there). This is a **two-phase apply**:
  1. `terraform apply` — the cert is created `PENDING_VALIDATION`. Read
     `terraform output web_acm_validation_records` and create those CNAMEs in
     your DNS.
  2. Once the cert reaches `ISSUED`, `terraform apply` again to finish the
     CloudFront distribution, then point `custom_domain_web` DNS at
     `cloudfront_domain_name`.

## Storage: keyless (ECS task role)

The API's S3 adapter
([`packages/storage/src/adapters/minioAdapter.ts`](../../../packages/storage/src/adapters/minioAdapter.ts))
omits explicit credentials when `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` are
unset, so the AWS SDK v3 **default credential chain** picks up the **ECS task
role** automatically. This stack therefore grants a least-privilege S3 policy
(scoped to the files bucket only) directly to the task role — **no IAM user, no
long-lived access key, no Secrets Manager entry** for storage. There is nothing
to rotate or leak, and the task carries no S3 credential in its config.

> **AWS only.** This keyless path relies on the AWS default credential chain.
> Google Cloud Storage's S3-interoperability API authenticates only with HMAC
> keys, so the GCP stack still provisions and injects an HMAC key pair (see
> `infra/terraform/gcp/`). Keyless there would need a native GCS adapter
> (Workload Identity), which is out of scope.

To keep the files bucket off the public internet, the app supports a **storage
relay**: set `MINIO_RELAY_ENABLED=true` and `api_origin` so the API proxies
presigned URLs under `<API_ORIGIN>/api/storage` (see
[`docs/infrastructure/FileStorage.md`](../../../docs/infrastructure/FileStorage.md)).
This reference exposes S3 directly via presigned URLs (the historical default)
and leaves the relay off.

### Migrating from the static-key revision

An earlier revision of this stack provisioned a dedicated `aws_iam_user` plus an
`aws_iam_access_key` and injected the pair through two Secrets Manager entries.
If you applied that revision, **`terraform apply` on this one is destructive**.
Read this before applying:

- `aws_iam_user.app_storage` and `aws_iam_access_key.app_storage` are
  **destroyed**. Any other consumer of that key (a script, a CI job, a second
  environment) loses access — check before applying.
- The two MinIO Secrets Manager secrets are **deleted with
  `recovery_window_in_days = 0`**: immediate and **unrecoverable**. Copy out any
  value you still need first.
- The key material also disappears from **Terraform state**, which is part of
  the point — but it means the state file's history (if versioned remotely) is
  the last place it survives.
- There is a **transient failure window**. Terraform deletes the access key and
  registers the new task definition immediately, but ECS replaces tasks
  gradually. Until the rollout finishes, old tasks still hold the now-deleted
  key in their environment and get `403 InvalidAccessKeyId` from S3 — **uploads
  fail for the duration**.

For a clean cutover, force the replacement instead of waiting for it:

```bash
terraform apply
aws ecs update-service \
  --cluster "<name_prefix>-cluster" \
  --service "<name_prefix>-api" \
  --force-new-deployment
```

Migrating in the other direction (back to static keys) needs no Terraform
change: set `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` on the task and the adapter
signs with them again.

## What this stack does NOT include

Deliberately out of scope (not wired into the app today, or better handled by
the adopter):

- AI features, email/SMTP, background job workers/schedulers.
- Deep observability (Container Insights is off; only basic CloudWatch logs).
- An IdP (bring your own OIDC), a bastion/VPN for private DB access, or DNS zones.
- CI/CD pipelines — image build/push and web upload are documented manual steps.

## Cost caveat

The main always-on costs are the **NAT gateway**, the **ALB**, and the **RDS
instance** (each roughly in the tens of USD/month at the reference sizes),
plus data transfer. Enabling `db_multi_az`, `enable_waf`, or scaling
`api_desired_count` increases cost. For a throwaway evaluation, `terraform
destroy` removes everything (secrets use a 0-day recovery window, and the DB
skips its final snapshot by default).

## File layout

| File                       | Concern                                               |
| -------------------------- | ----------------------------------------------------- |
| `versions.tf`              | Terraform + AWS providers (incl. the us-east-1 alias) |
| `variables.tf`             | All inputs                                            |
| `locals.tf`                | Derived names, shared data sources                    |
| `network.tf`               | VPC, subnets, NAT, security groups                    |
| `secrets.tf`               | DB password + Secrets Manager containers              |
| `database.tf`              | RDS PostgreSQL                                        |
| `storage.tf`               | Files S3 bucket + IAM key                             |
| `registry.tf`              | ECR repository                                        |
| `api.tf`                   | ECS cluster/service/task, ALB                         |
| `frontend.tf`              | Web S3 bucket, CloudFront, optional WAF               |
| `outputs.tf`               | Outputs + post-apply checklist                        |
| `terraform.tfvars.example` | Example inputs                                        |
