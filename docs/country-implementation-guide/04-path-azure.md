# 4. Infrastructure — Azure path

This path runs the platform on Azure, provisioned entirely by the Bicep templates in
[`infra/`](../../infra/): the API on App Service, the web app on a Static Web App, PostgreSQL
Flexible Server, Blob Storage and Key Vault. No resource is created by hand. Read
[4. Infrastructure](./04-infrastructure.md) first for what applies to both paths (identity provider
contract, staging gate, rollback).

Reference guides with every detail: [`Deployment.md`](../infrastructure/Deployment.md) and
[`provisioning-model.md`](../infrastructure/provisioning-model.md).

← [4. Infrastructure](./04-infrastructure.md) · [Index](./README.md) · Next: [5. Validation and go-live](./05-validation-and-go-live.md) →

---

## 4A. Provision: request to the national IT team

- [ ] An Azure subscription with a confirmed budget and payment method, and permission to deploy
      resources programmatically.
- [ ] Access through Microsoft Entra ID with at least the **Contributor** role on the subscription
      or resource group (plus User Access Administrator if the subscription policy requires it).
- [ ] Permission to create resource groups, or empty pre-created ones (one per environment:
      staging and production). Their contents are managed only by Bicep.
- [ ] The resource providers Bicep needs registered on the subscription (`Microsoft.Web`,
      `Microsoft.Storage`, `Microsoft.DBforPostgreSQL`, `Microsoft.KeyVault`, `Microsoft.Insights`,
      `Microsoft.OperationalInsights`; plus `Microsoft.CognitiveServices` and `Microsoft.Search` if
      the chatbot is enabled).
- [ ] An identity provider: an Entra External ID tenant (or another provider that meets
      [the contract](./04-infrastructure.md#what-the-identity-provider-must-provide)) with two app
      registrations (API and frontend) and the `access_as_user` scope
      ([`AzureAuthenticationSetup.md`](../infrastructure/AzureAuthenticationSetup.md)).
- [ ] The public domain for the web app, if it will not use the default Azure address.
- [ ] A deploy machine with the Azure CLI, Docker, Node.js and pnpm, and the country branch checked
      out.

The database needs no DBA work on this path: Bicep already allows the pgvector extension on the
server, and the API and the migrations use the same database credentials, which Bicep stores in
Key Vault.

## Configuration

Two places hold the configuration of each environment:

| Where                                        | What                                                                                                                                                                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `infra/.envrc`                               | Environment name, subscription, resource group, region, optional custom domain, and the identity values: `AZURE_TENANT_ID`, `AZURE_TENANT_SUBDOMAIN` (External ID only), `AZURE_API_CLIENT_ID`, `AZURE_FRONT_CLIENT_ID` |
| `infra/params/main.<environment>.bicepparam` | Sizing and feature switches for that environment (copy `main.development.bicepparam`)                                                                                                                                   |

Set the identity values before the first deploy: `deploy.sh` and `deploy-web.sh` derive from them
the token-validation settings of the API and the OIDC settings baked into the web app. No real
credentials go into documents, comments or the repository.

## First production deploy sequence

Run this only after the [staging gate](./04-infrastructure.md#staging-gate-before-production)
passes, from the `infra/` folder of the country branch:

1. **Provision** the environment: `./deploy.sh`
   ([`Deployment.md`](../infrastructure/Deployment.md)).
2. **Migrate**: allow your IP in the PostgreSQL firewall, then run `./run-migrations.sh`. It reads
   the database credentials from Key Vault ([`Migrations.md`](../infrastructure/Migrations.md)).
   Repeat on every release.
3. **Seed once**, from the repository root, with the same database credentials and the storage
   variables of the environment:

   ```bash
   export DATABASE_URL='postgresql://<db-user>:<url-encoded-password>@<db-host>:5432/<db-name>?schema=public&sslmode=require'
   export STORAGE_PROVIDER=azure_blob_storage
   # plus AZURE_STORAGE_ACCOUNT_NAME, _CONTAINER_NAME, _TENANT_ID, _CLIENT_ID, _CLIENT_SECRET
   pnpm install
   pnpm --filter @repo/seed seed
   ```

   It fails without writing anything if the storage account is unreachable, because it uploads the
   badges and the terms and conditions.

4. **Deploy the API**: `./deploy-api.sh` builds the image, pushes it to the registry and updates
   App Service ([`ApiDeployment.md`](../infrastructure/ApiDeployment.md)).
5. **Deploy the web app**: `./deploy-web.sh`
   ([`StaticWebAppDeployment.md`](../infrastructure/StaticWebAppDeployment.md)).
6. **Create the first `SUPERADMIN`**: the person signs in once, then, with the same `DATABASE_URL`
   exported:

   ```bash
   pnpm db:promote-superadmin <admin-email>
   ```

7. **Create the other administrators**: each person signs in once, then the `SUPERADMIN` assigns
   the system `ADMIN` role in `/admin/users`.

For later releases, repeat steps 2, 4 and 5; the seed never runs again.

## Backups

| What              | How                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------ |
| Database          | Automated backups with point-in-time restore; 30 days and geo-redundancy recommended |
| File store        | Geo-redundant storage plus blob soft delete                                          |
| Identity provider | Entra keeps the accounts; export the app-registration settings                       |

Restore procedures are in the [runbook](../operations/runbook.md#backup).

## Issues already seen in the field

| Symptom                                                            | Cause                                                                | Fix                                                                                     |
| ------------------------------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Provisioning stops before anything is created                      | No active subscription or payment method                             | Confirm budget and payment before starting ([phase 1](./01-institutional-decisions.md)) |
| `run-migrations.sh` cannot reach the database                      | Your IP is not in the PostgreSQL firewall                            | Add it before migrating ([`Migrations.md`](../infrastructure/Migrations.md))            |
| Migrate fails with `type "system_role" already exists`, then P3009 | The database ran the migration history from before its consolidation | One-time [migration history reset](../operations/migration-history-reset.md)            |
| Login fails with 401 behind a VPN or slow links                    | Node's connection-attempt timeout is too short                       | Fixed in the API (2.5 s per attempt); run a recent release                              |

---

← [4. Infrastructure](./04-infrastructure.md) · [Index](./README.md) · Next: [5. Validation and go-live](./05-validation-and-go-live.md) →
