# Huella Latam — GCP Terraform reference stack

A deployable, cloud-neutral reference for hosting **Huella Latam** on Google
Cloud. It mirrors the Azure Bicep reference (`infra/`) resource-for-resource so
non-Azure adopters have a correct starting point. Treat it as an **example** to
read, adapt, and harden — not a turnkey production config.

It provisions:

- **Cloud Run** — the stateless API container (port 8080, `GET /health`).
- **Cloud SQL for PostgreSQL** — the database, reached only via the built-in
  Cloud SQL Auth Proxy (no public authorized networks).
- **Cloud Storage** — a private `files` bucket (user uploads) plus a public
  `web` bucket for the SPA.
- **Global external HTTPS load balancer + Cloud CDN** — edge for the SPA.
- **Artifact Registry** — the API image repository.
- **Secret Manager** — `DATABASE_URL` and the GCS S3-interop HMAC credentials.

Terraform provisions **infrastructure only**. Building/pushing the API image,
building/uploading the SPA, and running DB migrations are documented manual
steps below (as in the Azure reference).

---

## Azure → GCP mapping

| Concern            | Azure (Bicep)                                                            | GCP (this stack)                                                          |
| ------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| API compute        | App Service (Linux container) — `infra/modules/appService.bicep`         | Cloud Run v2 — `api.tf`                                                   |
| Database           | PostgreSQL Flexible Server — `infra/modules/postgres.bicep`              | Cloud SQL for PostgreSQL — `database.tf`                                  |
| DB connectivity    | Public endpoint + firewall rules                                         | Public IP, no authorized networks + Cloud SQL Auth Proxy socket           |
| File storage       | Storage Account + `files` blob container — `infra/modules/storage.bicep` | Cloud Storage bucket (`files`) — `storage.tf`                             |
| Storage auth       | Managed identity + RBAC (Azure Blob adapter)                             | HMAC key via S3-interop (MinIO adapter) — `storage.tf` / `secrets.tf`     |
| Secrets            | Key Vault — `infra/modules/keyVault.bicep`                               | Secret Manager — `secrets.tf`                                             |
| Container registry | Azure Container Registry — `infra/modules/acr.bicep`                     | Artifact Registry — `registry.tf`                                         |
| SPA hosting        | Static Web App — `infra/modules/staticWebApp.bicep`                      | Cloud Storage web bucket + HTTPS LB — `frontend.tf`                       |
| CDN / edge / WAF   | Front Door (+ WAF) — `infra/modules/frontDoor.bicep`                     | Cloud CDN + global HTTPS LB (+ optional Cloud Armor EDGE) — `frontend.tf` |
| Identity provider  | Entra External ID — `infra/modules/azureAuth.bicep`                      | **Bring your own** OIDC IdP (not provisioned)                             |
| Naming uniqueness  | `uniqueString(resourceGroup().id)`                                       | `${name_prefix}-${environment}` + `project_id` suffix on buckets          |

---

## Prerequisites

- **Terraform >= 1.5.0** (providers: `hashicorp/google` and
  `hashicorp/google-beta`, `~> 5.40`).
- **gcloud CLI** authenticated with Application Default Credentials:
  ```bash
  gcloud auth login
  gcloud auth application-default login
  gcloud config set project <PROJECT_ID>
  ```
- A **GCP project with billing enabled**. The APIs the stack needs are enabled
  by Terraform (`google_project_service`).
- **Docker** (to build the API image).
- **pnpm** + Node (to build the SPA), per the repo root.

---

## Deploy

```bash
cd infra/terraform/gcp
cp terraform.tfvars.example terraform.tfvars   # edit: project_id is required
terraform init
terraform plan
terraform apply
```

`terraform output next_steps` prints the post-apply checklist with your concrete
resource names filled in.

> **First apply note.** `api_image` defaults to a placeholder that does not
> exist. The Cloud Run service is created but its first revision cannot pull an
> image until you build and push one (next section), then set `api_image` and
> re-apply. This is expected for a fresh project.

---

## 1. Build & push the API image

```bash
# From the repo root.
gcloud auth configure-docker <REGION>-docker.pkg.dev

REPO=$(terraform -chdir=infra/terraform/gcp output -raw artifact_registry_repository)
docker build -f apps/api/Dockerfile -t "$REPO/api:v1" .
docker push "$REPO/api:v1"
```

Then point Cloud Run at it, either by re-applying with the new tag:

```bash
terraform apply -var="api_image=$REPO/api:v1"
```

or with a direct deploy:

```bash
gcloud run deploy huella-prod-api --image "$REPO/api:v1" --region <REGION>
```

(Build on `linux/amd64` if your workstation is ARM: add `--platform linux/amd64`
to `docker build`.)

---

## 2. Build & upload the web SPA

The SPA is compiled with `VITE_*` values inlined at build time. See
`apps/web/Dockerfile` for the full argument list; the key ones:

- `VITE_API_BASE_URL` — the API origin (`api_url` output / your custom API domain).
- `VITE_OIDC_ISSUER`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_REDIRECT_URI`,
  `VITE_OIDC_SCOPES` — your BYO OIDC IdP.
- `STORAGE_ORIGIN` — `https://storage.googleapis.com` (baked into the CSP so the
  browser may talk to the files bucket).

```bash
# From the repo root, with the VITE_* env exported.
pnpm --filter web build
WEB_BUCKET=$(terraform -chdir=infra/terraform/gcp output -raw gcs_web_bucket)
gsutil -m rsync -d -r apps/web/dist "gs://$WEB_BUCKET"
```

The web bucket is fronted by the CDN-enabled load balancer; content updates
propagate as the CDN cache expires (invalidate with
`gcloud compute url-maps invalidate-cdn-cache` if needed).

---

## 3. Run database migrations

Migrations run from a dev machine over the **Cloud SQL Auth Proxy** (the API
image does not run migrations at boot). See `packages/database`.

```bash
CONN=$(terraform -chdir=infra/terraform/gcp output -raw cloud_sql_connection_name)
cloud-sql-proxy "$CONN" &        # listens on 127.0.0.1:5432

# DATABASE_URL for local migration run (password: pull from Secret Manager).
# The secret id is the `database_url_secret_id` output; or reconstruct with the
# generated password. Then, from packages/database, run the Prisma deploy.
export DATABASE_URL="postgresql://pgadmin:<PASSWORD>@127.0.0.1:5432/huella_latam"
pnpm --filter @repo/database prisma migrate deploy
```

The password is generated by Terraform and stored inside the assembled
`DATABASE_URL` secret; retrieve it with
`gcloud secrets versions access latest --secret="$(terraform output -raw database_url_secret_id)"`.

---

## 4. Wire OIDC / JWKS (bring your own IdP)

This stack does **not** provision an identity provider. The API validates tokens
via JWKS; set from your IdP's discovery document and re-apply:

- `jwks_issuer`, `jwks_uri`, `jwks_audience` (and optionally
  `jwks_required_scope` / `jwks_skip_scope_check`).

See `docs/infrastructure/GenericOidcAuthenticationSetup.md`. The SPA must be
rebuilt (step 2) with matching `VITE_OIDC_*` values.

---

## Object storage: GCS via S3-interop (HMAC)

The app's storage adapter (`packages/storage/src/adapters/minioAdapter.ts`) is
S3-native (`@aws-sdk/client-s3`, static key + secret, SigV4 presigning). Rather
than change app code, this stack uses Cloud Storage's **S3-compatible XML API**:

- `STORAGE_PROVIDER=minio`
- `MINIO_ENDPOINT=https://storage.googleapis.com`
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` = the HMAC key access id / secret
  (Secret Manager)
- `MINIO_BUCKET` = the files bucket, `MINIO_REGION` = the deploy region
- `MINIO_FORCE_PATH_STYLE=true` (the XML API uses path-style addressing)

**Tradeoff.** HMAC keys are long-lived static credentials. The more secure,
keyless option (Workload Identity + the GCS-native JSON API) would require adding
a GCS adapter in `packages/storage` — out of scope here, since the app contract
is fixed.

**Browser-direct presign caveat.** By default the browser uploads/downloads
directly against presigned `https://storage.googleapis.com` URLs (the web CSP
must include that origin — see `STORAGE_ORIGIN` in step 2). If browser-direct
presign is problematic (CORS, corporate egress, signature edge cases), set
`MINIO_RELAY_ENABLED=true` and `API_ORIGIN` on the API so it relays presigned
traffic through `<API_ORIGIN>/api/storage/*` and GCS need not be hit directly by
the browser. (Add that env in `api.tf` if you adopt the relay.)

---

## Custom domain + managed SSL

- With `custom_domain_web = ""` (default): the LB serves the SPA over **HTTP** on
  the reserved anycast IP (`lb_ip_address` output). Good for a quick test; not
  for production.
- With a domain set: Terraform provisions a **Google-managed SSL certificate**
  and the HTTPS (443) forwarding rule. Point the domain's DNS **A record at
  `lb_ip_address` first** — managed cert provisioning only completes once the
  domain resolves to the LB, and can take **15–60 minutes**.

---

## Cloud Armor caveat

`enable_cloud_armor = true` attaches a Cloud Armor policy to the web backend
**bucket**. Backend buckets only accept **EDGE-tier** (`CLOUD_ARMOR_EDGE`)
policies, which support a **limited rule set** — notably **no rate limiting and
no managed (OWASP/bot) rule sets** (those require a backend _service_, not a
bucket). The Azure Front Door WAF (rate limiting + managed rules) therefore has
no exact backend-bucket equivalent here. The shipped policy is a permissive
default; extend the `rule` blocks in `frontend.tf` for real edge filtering.

---

## Optional: private networking

`enable_private_networking = true` provisions a VPC, a Serverless VPC Access
connector, and Private Services Access, and gives Cloud SQL a private IP (Cloud
Run egresses through the connector). Default `false` uses the simpler, secure
public-IP + Auth Proxy path — no VPC required. See `network.tf`.

---

## What this stack does NOT include

Parity with the Azure reference and the app's current wiring only. Not provisioned:

- **AI / LLM** features — not wired into the app.
- **Email / notifications** — no SMTP or transactional email.
- **Background jobs / queues / schedulers**.
- **Deep observability** — beyond Cloud Run/Cloud SQL defaults there is no
  dashboards/alerting/log-based metrics setup.
- **An identity provider** — bring your own OIDC IdP.
- **CI/CD** — image build and SPA upload are manual (above).

---

## Cost caveat

The main **always-on** costs are:

- the **global forwarding rule(s)** on the load balancer (billed hourly even at
  zero traffic),
- the **Cloud SQL instance** (billed while running, per `db_tier`),
- the reserved **static IP** and any **Cloud Run min instances** (`api_min_instances >= 1`).

Cloud Storage and Artifact Registry are usage-priced and cheap at low volume.
For a low-cost sandbox, set `api_min_instances = 0`, use a smaller `db_tier`, and
consider whether you need the LB (you can serve the SPA bucket directly during
evaluation).

---

## Cleanup

```bash
terraform destroy
```

Set `db_deletion_protection = false` (the default) for the instance to be
removable. Enabled Google APIs are intentionally left enabled on destroy.
