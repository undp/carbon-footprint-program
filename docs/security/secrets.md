# Secrets Management

This document describes how credentials, API keys, and other secrets are managed across the Huella Latam platform — in application code, infrastructure, CI/CD pipelines, and local development.

---

## Guiding Principle

> **No secrets in code. No secrets in CI/CD pipelines. Managed identities where possible.**

The platform follows a layered secrets model:
1. **Managed identities** — preferred for Azure-to-Azure communication (no secret exists at all)
2. **Azure Key Vault** — for secrets that must exist (database passwords, external keys)
3. **App Service application settings with Key Vault references** — secrets injected as env vars at runtime, never stored in code or containers
4. **OIDC federation** — for GitHub Actions to Azure authentication (no stored credentials)

---

## Secrets by Category

### Azure SDK Authentication (Managed Identity)

All Azure SDK calls within the API use `DefaultAzureCredential` from `@azure/identity`. This credential chain resolves authentication without any secret:

| Environment | Credential resolved |
|---|---|
| Azure (App Service) | System-assigned Managed Identity |
| Local development | Azure CLI (`az login`) session |
| CI/CD (GitHub Actions) | OIDC federated token |

**Services using managed identity:**
- Azure Blob Storage (`BlobServiceClient`) — the App Service identity has `Storage Blob Data Contributor` and `Storage Blob Delegator` roles assigned via Bicep RBAC.

No connection strings, storage account keys, or SAS tokens are stored in application configuration.

### Database Connection (`DATABASE_URL`)

The PostgreSQL connection string contains the database password and must be treated as a secret.

**Pattern in Production / Staging:**
1. The Bicep deployment generates the PostgreSQL admin password and stores it in Azure Key Vault as the `postgres-admin-password` secret.
2. The App Service app setting `DATABASE_URL` is configured as a Key Vault reference: `@Microsoft.KeyVault(SecretUri=https://<vault-name>.vault.azure.net/secrets/postgres-admin-password/)`.
3. At runtime, Azure resolves the reference and injects the value as an environment variable. The value never appears in the Bicep template, container image, or logs.

**Local development:** `DATABASE_URL` is set in a `.env` file pointing to the local Docker Compose PostgreSQL instance. `.env` files are in `.gitignore` and must never be committed.

### JWT Secret (`JWT_SECRET`)

The `JWT_SECRET` environment variable is used only when `AUTH_PROVIDER` is set to `forced-user` or `none` — both of which are development-only modes. In Production, `AUTH_PROVIDER=jwks` is used, which validates tokens via JWKS public key material and does not use `JWT_SECRET`.

| Environment | `AUTH_PROVIDER` | `JWT_SECRET` used? |
|---|---|---|
| Production | `jwks` | No |
| Staging | `jwks` | No |
| Local development | `forced-user` or `none` | Yes (dev only) |

**Critical:** The codebase contains a hardcoded fallback for `JWT_SECRET`:

```typescript
// apps/api/src/config/environment.ts
JWT_SECRET: process.env.JWT_SECRET ?? "super-secret-key"
```

This fallback exists purely for local convenience. It must never be relied upon in any environment where `AUTH_PROVIDER=forced-user` is used with real data. The `forced-user` provider should never be enabled in Staging or Production regardless.

### JWKS / Entra ID Credentials

No application secret is required for JWKS-based token validation. The JWKS endpoint serves public key material. The only configuration needed is:

- `JWKS_URI` or `AZURE_TENANT_ID` — to locate the JWKS endpoint
- `AZURE_CLIENT_ID` — the API's app registration client ID (this is a public identifier, not a secret)

The app registration's **client secret is never used by the API**. Token validation uses only the public signing key from the JWKS endpoint.

### GitHub Actions → Azure (OIDC Federation)

CI/CD pipelines authenticate to Azure using OpenID Connect federation — no client secret or certificate is stored in GitHub secrets.

| Property | Value |
|---|---|
| Method | OIDC federated credential on Azure App Registration |
| GitHub secret stored | None (no `AZURE_CLIENT_SECRET` or equivalent) |
| Token lifetime | Short-lived, issued per workflow run |
| Scope | Least-privilege role on the target resource group |

For setup details, see [Infrastructure Provisioning Model](../infrastructure/provisioning-model.md).

---

## Azure Key Vault

Key Vault is provisioned per environment via Bicep with the following configuration:

| Setting | Value |
|---|---|
| **Access model** | Azure RBAC (not legacy access policies) |
| **Soft delete retention** | 90 days |
| **Purge protection** | Configurable (recommended: enabled in Production) |
| **Network access** | Default allow; can be restricted to VNet or specific IPs |

### Role assignments

| Principal | Role | Scope |
|---|---|---|
| App Service Managed Identity | `Key Vault Secrets User` | Key Vault |
| Developer group (optional) | `Key Vault Secrets Officer` | Key Vault (Staging/dev only) |
| CI/CD service principal | `Key Vault Secrets User` | Key Vault (for deployment reads) |

### What is stored in Key Vault

| Secret name | Contents | Used by |
|---|---|---|
| `postgres-admin-password` | PostgreSQL admin password | App Service (via Key Vault reference), Bicep deployment |

As new integrations are added (Azure OpenAI, AI Search, Communication Services), their keys must be added to Key Vault and injected as Key Vault references — never hardcoded or stored as plaintext app settings.

---

## Environment Variables and Secrets Classification

The following env vars are used by the API. Each is classified by sensitivity:

| Variable | Sensitivity | Delivery method |
|---|---|---|
| `DATABASE_URL` | **Secret** — contains DB password | Key Vault reference → App Service setting |
| `JWT_SECRET` | **Secret** — signing key for dev modes | Key Vault reference (if used at all) |
| `AZURE_TENANT_ID` | Non-secret — public tenant identifier | App Service setting (plaintext) |
| `AZURE_CLIENT_ID` | Non-secret — public app registration ID | App Service setting (plaintext) |
| `AZURE_STORAGE_ACCOUNT_NAME` | Non-secret — public resource name | App Service setting (plaintext) |
| `AZURE_STORAGE_CONTAINER_NAME` | Non-secret — public container name | App Service setting (plaintext) |
| `ALLOWED_ORIGIN` | Non-secret — frontend hostname | App Service setting (plaintext) |
| `AUTH_PROVIDER` | Non-secret — provider selector | App Service setting (plaintext) |
| `BOOTSTRAP_SUPERADMIN` | Non-secret — but dangerous if `true` | App Service setting; **must be `false` in Production** |

Full variable reference: [Environment Variables](../development/environment-variables.md).

---

## Local Development

For local development, secrets are managed via a `.env` file at `apps/api/.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/huella_latam
AUTH_PROVIDER=forced-user
BOOTSTRAP_SUPERADMIN=true
JWT_SECRET=local-dev-only
```

**Rules:**
- `.env` is in `.gitignore` — never commit it.
- Never use production database credentials in a local `.env`.
- Never share `.env` files over Slack, email, or any unencrypted channel.
- Use `forced-user` or `none` for `AUTH_PROVIDER` locally; never point local dev at a production Entra ID tenant with real user accounts.

---

## Secret Rotation

| Secret | Rotation trigger | Procedure |
|---|---|---|
| PostgreSQL admin password | Security incident; periodic policy | Update Key Vault secret → App Service picks up new value at next restart or slot swap |
| Entra ID app registration (if client secret used) | Expiry or incident | Rotate in Entra portal → update Key Vault → restart App Service |
| OIDC federated credential | Expiry | Renew in Azure App Registration → no GitHub secret to update |
| Storage account key (if ever used) | Never — use managed identity | N/A |

---

## Anti-Patterns to Avoid

| Anti-pattern | Why it's prohibited |
|---|---|
| Hardcoded secrets in source code | Leaked in git history; visible to all contributors |
| Secrets as plaintext App Service settings (not Key Vault references) | Visible in Azure Portal to anyone with resource read access |
| Storing `AZURE_CLIENT_SECRET` in GitHub Actions secrets | Replaced by OIDC federation; secrets can be leaked in logs |
| Using storage account keys instead of managed identity | Keys must be rotated; managed identity has no expiry |
| Setting `JWT_SECRET` to `"super-secret-key"` in any deployed environment | Trivially guessable; compromises token integrity |
| Committing `.env` files | Exposes all local secrets permanently in git history |
