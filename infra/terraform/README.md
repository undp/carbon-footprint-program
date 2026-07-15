# Cloud-neutral IaC examples (Terraform)

Deployable **Terraform** reference stacks that provision Huella Latam on a cloud **other
than Azure**. Two clouds are covered, each mirroring the Azure Bicep reference in
[`infra/`](../):

| Stack            | Target                | Guide                              |
| ---------------- | --------------------- | ---------------------------------- |
| [`aws/`](./aws/) | Amazon Web Services   | [`aws/README.md`](./aws/README.md) |
| [`gcp/`](./gcp/) | Google Cloud Platform | [`gcp/README.md`](./gcp/README.md) |

> **These are adopter examples, not the officially supported deployment path.** UNDP's
> supported reference deployment is **Azure Bicep + GitHub Actions + OIDC** (see
> [`docs/infrastructure/provisioning-model.md`](../../docs/infrastructure/provisioning-model.md)
> and [`infra/`](../)). These Terraform stacks exist so a country deployment that must run
> on AWS or GCP has a correct, complete starting point instead of a blank page — closing
> the "cloud-neutral IaC" gap for [DPGA](https://digitalpublicgoods.net/standard/)
> Indicator 4 (platform independence) and Indicator 8 (best practices).

## Why the app ports cleanly

Nothing in the application is Azure-specific — the closed pieces of the Azure reference
are operational conveniences, each with an open, portable substitute (see the _Platform
Independence_ table in the [root README](../../README.md)):

- **Object storage is S3-native.** The storage adapter
  ([`packages/storage/src/adapters/minioAdapter.ts`](../../packages/storage/src/adapters/minioAdapter.ts))
  is built on the AWS S3 SDK. AWS S3 works directly; Google Cloud Storage works through
  its **S3-interoperability (XML API) + HMAC keys**. Both selected with
  `STORAGE_PROVIDER=minio` — **no application code changes**.
- **Auth is generic OIDC/JWKS.** The API only consumes `JWKS_ISSUER` / `JWKS_URI` /
  `JWKS_AUDIENCE`, so any compliant IdP works. These stacks are **bring-your-own-OIDC**
  and do not provision an identity provider (see
  [`docs/infrastructure/GenericOidcAuthenticationSetup.md`](../../docs/infrastructure/GenericOidcAuthenticationSetup.md)).
- **API and web are plain containers** ([`apps/api/Dockerfile`](../../apps/api/Dockerfile),
  [`apps/web/Dockerfile`](../../apps/web/Dockerfile)), so any container platform can host them.

## Service mapping

Each stack replicates the services the running app actually depends on today — i.e. what
[`infra/main.bicep`](../main.bicep) provisions.

| Azure (Bicep reference)                | AWS (`aws/`)                                | GCP (`gcp/`)                                          |
| -------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| PostgreSQL Flexible Server             | RDS for PostgreSQL                          | Cloud SQL for PostgreSQL                              |
| Blob Storage (`files` container)       | S3 bucket + IAM access key                  | GCS bucket + service-account HMAC key                 |
| App Service (Linux container, `:8080`) | ECS Fargate service + ALB                   | Cloud Run service                                     |
| Static Web App (React SPA)             | S3 bucket + CloudFront (OAC)                | GCS bucket + HTTPS LB + Cloud CDN                     |
| Front Door (CDN + WAF, optional)       | CloudFront + optional AWS WAF               | Cloud CDN + optional Cloud Armor                      |
| Container Registry (ACR)               | Elastic Container Registry (ECR)            | Artifact Registry                                     |
| Key Vault                              | Secrets Manager                             | Secret Manager                                        |
| Managed Identity → resource roles      | IAM roles (ECS task role) + IAM user        | Service accounts + IAM                                |
| Entra ID (OIDC, optional)              | bring-your-own OIDC (Cognito is one option) | bring-your-own OIDC (Identity Platform is one option) |
| Custom domain + managed TLS            | ACM certificate                             | Google-managed SSL certificate                        |

## Shared prerequisites

- **Terraform** ≥ 1.5 (or OpenTofu).
- The target cloud's CLI + credentials (`aws` / `gcloud`) with permission to create the
  resources above.
- **Docker**, to build and push the API image (from [`apps/api/Dockerfile`](../../apps/api/Dockerfile)).
- **pnpm + Node** (versions pinned in [`.tool-versions`](../../.tool-versions)) to build the
  web SPA bundle that gets uploaded to the CDN origin.
- A reachable **PostgreSQL** target for Prisma migrations (`packages/database`) — run them
  once before first traffic.
- An **OIDC provider** for authentication (Keycloak, Entra, Cognito, Identity Platform, …).

Each per-cloud `README.md` walks through `terraform init/plan/apply`, building and pushing
the API image, uploading the web bundle, running migrations, and wiring OIDC/JWKS.

## Deployment shape

```
        Browser
          │
          ▼
   CDN + static SPA            (CloudFront+S3  /  Cloud CDN+GCS)
          │  API calls
          ▼
   API container  :8080        (ECS Fargate+ALB  /  Cloud Run)
      │        │        │
      ▼        ▼        ▼
  Postgres  Object     Secrets            (RDS/Cloud SQL · S3/GCS · Secrets/Secret Mgr)
            storage    manager
          ▲
   OIDC IdP (external / bring-your-own)
```

## What these stacks intentionally do **not** include

Mirroring the current Azure deployment, the following are **not** provisioned because they
are not wired into the running application yet (they appear only as "target state" in
[`provisioning-model.md`](../../docs/infrastructure/provisioning-model.md)): the AI zone
(OpenAI / AI Search), background-job workers (Azure Functions), transactional email
(Communication Services), and observability beyond container logs. Add the analogous
managed services on your cloud when those features land.

## Verification

Terraform configuration in both stacks is checked with `terraform fmt` and
`terraform validate` (provider-typed, no cloud credentials needed):

```bash
cd aws   # or: cd gcp
terraform fmt -recursive -check
terraform init -backend=false
terraform validate
```

`terraform plan` / `apply` require real cloud credentials and are run by the adopter.
