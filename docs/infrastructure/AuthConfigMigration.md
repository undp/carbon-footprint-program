# Auth config migration: `AZURE_*` → generic `JWKS_*`

A one-time migration for **existing** local setups and **already-deployed** Azure
environments. The API no longer derives its token-validation config from the
`AZURE_*` auth variables — it reads `JWKS_*` directly. The `AZURE_*` tenant values
are now raw inputs that the env templates and the deploy turn into `JWKS_*`.

> Background: [Azure Entra Authentication Setup](./AzureAuthenticationSetup.md) ·
> [Generic OIDC contract](./GenericOidcAuthenticationSetup.md). This guide is the
> upgrade runbook; those describe the end state.

## What changed

|                            | Before                                                                   | After                                                                                   |
| -------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| API auth config            | API derived `JWKS_*` from `AZURE_TENANT_TYPE/ID/SUBDOMAIN/API_CLIENT_ID` | API reads `JWKS_URI` / `JWKS_ISSUER` / `JWKS_AUDIENCE` / `JWKS_REQUIRED_SCOPE` directly |
| Token version              | Azure-only `v2.0` gate (when `AZURE_TENANT_ID` set)                      | No version check — issuer match covers it                                               |
| Where the URL formats live | application code (`environment.ts`)                                      | env templates (`.envrc.azure.example`) + deploy (`appService.bicep`)                    |

**If you do nothing**, an existing deployment that only has the `AZURE_*` auth
settings will, after taking the new API image, have **no** JWKS config → it falls
back to the static `JWT_SECRET` and rejects every token (401 on all requests).

## The derivation (single reference)

Everything below is computed from your tenant values. Note the CIAM split: the
token issuer uses the **tenant-GUID** host, the JWKS endpoint uses the
**subdomain** host.

**External / CIAM** (`AZURE_TENANT_TYPE=external`):

```
JWKS_ISSUER   = https://<TENANT_ID>.ciamlogin.com/<TENANT_ID>/v2.0
JWKS_URI      = https://<SUBDOMAIN>.ciamlogin.com/<TENANT_ID>/discovery/v2.0/keys
JWKS_AUDIENCE = <API_CLIENT_ID>
```

**Organizational / Azure AD** (`AZURE_TENANT_TYPE=organizational`):

```
JWKS_ISSUER   = https://login.microsoftonline.com/<TENANT_ID>/v2.0
JWKS_URI      = https://login.microsoftonline.com/<TENANT_ID>/discovery/v2.0/keys
JWKS_AUDIENCE = <API_CLIENT_ID>
```

`JWKS_REQUIRED_SCOPE` defaults to `access_as_user` — only set it to override.

---

## 1. Local dev — root `.envrc`

If your `.envrc` set the `AZURE_*` auth vars and relied on the app to derive the
rest, it now needs the `JWKS_*` too.

**Easiest:** start fresh from the helper, which derives everything from your raw
tenant values via shell interpolation (you never write a URL by hand):

```bash
cp .envrc.azure.example .envrc   # fill AZURE_TENANT_ID / SUBDOMAIN / API_CLIENT_ID / FRONT_CLIENT_ID
direnv allow
```

**Or** add a derivation block to your existing `.envrc`, right after the raw
`AZURE_*` values (mirrors `.envrc.azure.example`):

```bash
if [ "$AZURE_TENANT_TYPE" = "organizational" ]; then
  export JWKS_ISSUER="https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0"
  export JWKS_URI="https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/v2.0/keys"
else
  export JWKS_ISSUER="https://${AZURE_TENANT_ID}.ciamlogin.com/${AZURE_TENANT_ID}/v2.0"
  export JWKS_URI="https://${AZURE_TENANT_SUBDOMAIN}.ciamlogin.com/${AZURE_TENANT_ID}/discovery/v2.0/keys"
fi
export JWKS_AUDIENCE="$AZURE_API_CLIENT_ID"
```

The frontend `VITE_OIDC_*` derivation is unchanged. Keycloak / non-Azure setups
were already on `JWKS_*` and need no change.

---

## 2. docker-compose `.env` files

`.env` files **cannot** interpolate, so set the `JWKS_*` values explicitly using
the formulas above. In your `.env.dockercompose` / `.env.prod.dockercompose`,
replace the `AZURE_TENANT_TYPE/ID/SUBDOMAIN/API_CLIENT_ID` auth lines with:

```ini
AUTH_PROVIDER=jwks
JWKS_ISSUER=https://<TENANT_ID>.ciamlogin.com/<TENANT_ID>/v2.0          # CIAM example
JWKS_URI=https://<SUBDOMAIN>.ciamlogin.com/<TENANT_ID>/discovery/v2.0/keys
JWKS_AUDIENCE=<API_CLIENT_ID>
```

Keep the `AZURE_STORAGE_*` lines (storage is unaffected). Then rebuild + restart:
`docker compose -f docker-compose.prod.yml --env-file .env.prod.dockercompose up -d --build`.
(The committed `.env*.dockercompose.example` already show this layout.)

---

## 3. Azure App Service (already deployed)

Apply this to **each** deployed environment (one per resource group). Find the API
app name:

```bash
az webapp list -g <resource-group> --query "[?starts_with(name,'api-')].name" -o tsv
```

### Option A — redeploy via Bicep (recommended)

The updated `appService.bicep` derives and sets `JWKS_*` and no longer sets the
`AZURE_*` auth settings; the deployment stack reconciles the app settings
declaratively (old auth settings are dropped). Deploy the new API image, then:

```bash
cd infra
./deploy.sh        # reconciles App Service settings (sets JWKS_*, removes AZURE_* auth)
./deploy-web.sh    # rebuild the web app (also picks up the no-auth-boot fix)
```

`infra/.envrc` keeps its raw `AZURE_*` inputs — Bicep derives the rest. Nothing to
change there.

### Option B — manual hotfix (no full redeploy)

Safe order with no auth downtime — `JWKS_*` is honored by both the old and new API
image, so set it **first**, then ship the new image:

```bash
# 1) Set the generic config (works for the current AND the new image). Restarts the app.
az webapp config appsettings set -g <rg> -n <api-app> --settings \
  AUTH_PROVIDER=jwks \
  JWKS_ISSUER="https://<TENANT_ID>.ciamlogin.com/<TENANT_ID>/v2.0" \
  JWKS_URI="https://<SUBDOMAIN>.ciamlogin.com/<TENANT_ID>/discovery/v2.0/keys" \
  JWKS_AUDIENCE="<API_CLIENT_ID>"

# 2) Deploy the new API image (your usual API deploy — see ApiDeployment.md).

# 3) After verifying (below), optionally remove the now-ignored auth settings:
az webapp config appsettings delete -g <rg> -n <api-app> --setting-names \
  AZURE_TENANT_ID AZURE_API_CLIENT_ID AZURE_TENANT_TYPE AZURE_TENANT_SUBDOMAIN
```

> Do **not** delete the `AZURE_*` auth settings until step 2 is verified — keeping
> them lets you roll back to the previous image cleanly (it reads `AZURE_*`).

App Service **Authentication (Easy Auth)** must stay **disabled** — unchanged from
before; the `Bearer` token is validated in-process via JWKS.

---

## 4. Verify

1. `curl https://<api-host>/health` → `200` (the API booted; a JWKS misconfig does
   not crash boot, so also check the next steps).
2. Log stream — a missing issuer logs at boot:
   `az webapp log tail -g <rg> -n <api-app>` → look for
   `[auth] WARNING: ... but no issuer is set` (means `JWKS_ISSUER` is empty).
3. Log in through the web app and confirm an authenticated API call returns `200`
   (not `401`).

## Rollback

Redeploy the previous API image tag. The old image reads `AZURE_*` (still present
if you didn't delete them in 3.3) — or `JWKS_*`, which it also honors — so it keeps
working either way. This is why the safe order sets `JWKS_*` before removing
`AZURE_*`.
