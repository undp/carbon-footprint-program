# 4. Infrastructure

The platform is a web frontend and an API, plus PostgreSQL, a file store and an OIDC identity
provider. There are two ways to run it, each in its own document: pick one, and follow only that
document for provisioning and deployment. This page holds what applies to both.

The phase has two parts:

- **4A. Provision** the servers, database, storage and identity provider. Runs in parallel with
  phases 2 and 3; 2–4 weeks if the country already has servers and an available DBA.
- **4B. Staging check and first production deploy.** Re-seed staging with the final version, pass
  the [staging gate](#staging-gate-before-production), then build, migrate and seed production.
  Starts only when the seed has passed its
  [validation gate](./02-seed-content.md#validation-gate-before-seeding-production) and the
  [phase 3](./03-configuration-and-branding.md) configuration is final. About 2 weeks.

← [3. Configuration and branding](./03-configuration-and-branding.md) · [Index](./README.md) · Next: [5. Validation and go-live](./05-validation-and-go-live.md) →

---

## Choose your path

The choice follows from decision 7 in [phase 1](./01-institutional-decisions.md).

| If the country…                                                                                  | Follow                                                      |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Runs its own servers, has an existing PostgreSQL and a DBA, or must keep data inside the country | [On-premise path (Docker Compose)](./04-path-on-premise.md) |
| Has an Azure subscription with a confirmed budget and payment method                             | [Azure path](./04-path-azure.md)                            |

Both paths run the same application and pass through the same staging gate. What differs is who
provisions what, how images reach the servers, and how backups work.

## What both paths need

- **An OIDC identity provider** that meets the contract below, with an SMTP relay: the platform
  itself sends no email (members are added without invitations), but the IdP needs mail for
  account verification and password recovery.
- **A domain and a TLS certificate** for the web app and the API.
- **A staging environment** separate from production (see below).
- **Backups** of the database, the file store and the identity provider's user store, taken
  together. The country sets its recovery targets (how much data it can lose, how long it can be
  down) and tests a restore before go-live. Each path document explains how.

Sizing baseline: the reference production design assumes about 200 daily active users and a peak
of about 20 requests per second, concentrated in working hours. The API is stateless and scales
horizontally. The file store grows with the evidence organizations upload (up to 10 MB per file)
and is kept permanently, so plan storage growth year over year. Details:
[`requirements.md`](../infrastructure/requirements.md),
[`app-usage-assumptions.md`](../infrastructure/app-usage-assumptions.md) and
[`infra cost estimation.pdf`](<../infra cost estimation.pdf>).

### What the identity provider must provide

Any OIDC provider works if it meets this contract:

| Requirement   | Detail                                                                                 |
| ------------- | -------------------------------------------------------------------------------------- |
| Two clients   | A public SPA client (authorization code + PKCE) for the web, and an API audience       |
| Email claim   | `email` (or `preferred_username`) in the access token; tokens without one are rejected |
| Subject claim | `sub` (or `oid` on Entra): the stable user id                                          |
| API scope     | A scope emitted in the token, `access_as_user` by default                              |
| Audience      | The token's `aud` must equal the API's `JWKS_AUDIENCE`                                 |
| Discovery     | A standard `/.well-known/openid-configuration` document and a JWKS endpoint            |

Users are created on their first sign-in with the `USER` role and identified by the subject claim;
the email must be unique. **Choose the IdP for the long term:** switching to another provider later
gives every user a new subject, and existing accounts can no longer be matched. A government SSO or
digital-ID provider can be used if it meets the contract above.

## Staging and training environments

Staging runs the same deployment as production with its **own** database, file bucket and OIDC
client (its redirect URLs point at the staging domain); it never shares them with production. It
can be deployed during 4A with a draft seed. Because the seed only runs on an empty database,
staging is wiped and re-seeded each time the draft changes; production is seeded once, in 4B, only
after staging has passed with exactly the same seed and images.

Staging is therefore not a training environment: if organizations need somewhere to practise, run
a separate training instance seeded from the same final version.

## Staging gate (before production)

Production is seeded only once, so every functional check runs first in staging, on exactly what
production will receive:

1. Build the images from the final country branch and deploy them to staging.
2. Wipe the staging database and seed it with the final seed (the version that passed the
   [phase 2 gate](./02-seed-content.md#validation-gate-before-seeding-production)).
3. Pass every check below. If one fails, fix the seed or the branch and start again from step 1.

- [ ] Sign-up and sign-in with the country's identity provider, including password recovery by
      email.
- [ ] Create an organization, add members and assign organization roles.
- [ ] Complete a footprint, attach evidence and download the ZIP with summary and methodology.
- [ ] Recognition works as decided in phase 1. With `AUTOMATIC`, self-declaring awards the
      measurement badge at once. With `MANUAL`, approve, send back and reject a submission from
      `/admin/requests` ([admin guide](../operations/admin-guide.md)).
- [ ] Approve, send back and reject a verification submission and a reduction-project submission,
      which always go through admin review.
- [ ] Create a reduction project and a neutralization plan.
- [ ] Review the public transparency screen and the institutional pages.
- [ ] If the chatbot is enabled: ingest the corpus with `pnpm chatbot:ingest-corpus`
      ([runbook](../operations/runbook.md#chatbot-corpus-ingestion-and-activation)) and test
      questions about the national methodology.

## First production deploy sequence

Once the staging gate passes, deploy production with the sequence in your path document:
[on-premise](./04-path-on-premise.md#first-production-deploy-sequence) or
[Azure](./04-path-azure.md#first-production-deploy-sequence). Both end the same way:

- **The first `SUPERADMIN`** signs in once through the IdP (which creates their user) and is then
  promoted from outside the app. This bypasses the role audit trail; every later role change goes
  through the UI.
- **The other administrators** each sign in once, then the `SUPERADMIN` assigns them the system
  `ADMIN` role in `/admin/users`.

## Rolling back a release

Migrations only move forward; there is no down-migration. Before migrating production for a new
release, take a database backup (and note the file-store state). If the release fails, restore
that backup and redeploy the previous release. Rehearse every upgrade in staging first, on a copy
of production-like data.

## Security and privacy references

Government security and data-protection offices usually ask for these before production:

| Topic                                        | Document                                             |
| -------------------------------------------- | ---------------------------------------------------- |
| Personal data stored and how it is protected | [`sensitive-data.md`](../security/sensitive-data.md) |
| Hardening and deployment topology            | [`hardening.md`](../security/hardening.md)           |
| Audit logging of admin actions               | [`audit-logging.md`](../security/audit-logging.md)   |
| Secrets management                           | [`secrets.md`](../security/secrets.md)               |
| Monitoring and logs                          | [`observability.md`](../operations/observability.md) |

Data residency follows decision 7: on-premise keeps data in the country; on Azure it stays in the
region chosen at deploy time. With the chatbot enabled, prompts are sent to Azure OpenAI.

---

← [3. Configuration and branding](./03-configuration-and-branding.md) · [Index](./README.md) · Next: [5. Validation and go-live](./05-validation-and-go-live.md) →
