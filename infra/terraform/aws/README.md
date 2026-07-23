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
  bucket for user file uploads (accessed by the API with an IAM access key).
- **ECR** — registry for the API image.
- **Secrets Manager** — `DATABASE_URL` and the S3 access key/secret.
- **Optional WAFv2** — managed common rules + a rate limit on CloudFront.

## Azure → AWS mapping

| Concern              | Azure (Bicep)                                         | AWS (this stack)                        |
| -------------------- | ----------------------------------------------------- | --------------------------------------- |
| API compute          | App Service (`appService.bicep`)                      | ECS Fargate service + ALB (`api.tf`)    |
| Database             | PostgreSQL Flexible Server (`postgres.bicep`)         | RDS for PostgreSQL (`database.tf`)      |
| File storage         | Storage Account + `files` container (`storage.bicep`) | S3 bucket + IAM user key (`storage.tf`) |
| Web hosting          | Static Web App (`staticWebApp.bicep`)                 | S3 + CloudFront (`frontend.tf`)         |
| CDN / WAF            | Front Door + WAF (`frontDoor.bicep`)                  | CloudFront + WAFv2 (`frontend.tf`)      |
| Container registry   | ACR (`acr.bicep`)                                     | ECR (`registry.tf`)                     |
| Secrets              | Key Vault (`keyVault.bicep`)                          | Secrets Manager (`secrets.tf`)          |
| Network isolation    | Platform + PG firewall rules                          | VPC + security groups (`network.tf`)    |
| Identity for storage | Managed Identity (RBAC)                               | Static IAM access key (see note below)  |

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

## Storage: the static-key tradeoff

The API's S3 adapter
([`packages/storage/src/adapters/minioAdapter.ts`](../../../packages/storage/src/adapters/minioAdapter.ts))
builds its S3 client from an explicit access key + secret — it does **not** use
the AWS default credential chain, so it cannot use the ECS task role. This stack
therefore creates a dedicated least-privilege IAM user + access key (scoped to
the files bucket only) and injects it via Secrets Manager as `MINIO_ACCESS_KEY`
/ `MINIO_SECRET_KEY`. Moving to keyless task-role auth would require an
**app-code change** in the adapter and is out of scope for this reference.

To keep the files bucket off the public internet, the app supports a **storage
relay**: set `MINIO_RELAY_ENABLED=true` and `api_origin` so the API proxies
presigned URLs under `<API_ORIGIN>/api/storage` (see
[`docs/infrastructure/FileStorage.md`](../../../docs/infrastructure/FileStorage.md)).
This reference exposes S3 directly via presigned URLs (the historical default)
and leaves the relay off.

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
