# Chatbot AI — Required Azure Permissions

Azure RBAC needed to provision the AI resources for the chatbot RAG feature, plus the
PostgreSQL configuration change it depends on. Use this to validate that a deployment
subscription grants sufficient access **before** attempting the deployment.

> **The resources below are now infrastructure-as-code.** `infra/modules/openai.bicep`
> (account + both model deployments), `infra/modules/openAiRoleAssignment.bicep` (item 3), and
> the `azure.extensions` allowlist in `infra/modules/postgres.bicep` (item 4) deploy from the
> template, gated behind `enableChatbot` (default `false`). Nothing here needs to be created by
> hand — but every access requirement below still applies, because the deployment is what
> exercises them. A missing permission surfaces as a failed deployment rather than a missing
> resource.

Scope everything at the target **resource group** (or the specific resource, where noted).
RBAC is commonly granted per resource group, so a subscription-level check can be misleading.

## Summary

| #   | Action                                          | Azure operation                                                  | Roles that grant it                                            | Scope           | Status              |
| --- | ----------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- | --------------- | ------------------- |
| 0   | Exempt the subscription from the deny-AI policy | — (governance request, not RBAC)                                 | — (UNDP Data team + Cloud team approval)                       | Subscription    | ⛔ Blocked          |
| 1   | Create the Azure OpenAI account                 | `Microsoft.CognitiveServices/accounts/write`                     | `Contributor`, `Cognitive Services Contributor`, or `Owner`    | Resource group  | ⛔ Blocked by #0    |
| 2   | Create the chat + embedding deployments         | `Microsoft.CognitiveServices/accounts/deployments/write`         | `Cognitive Services Contributor`, `Contributor`, or `Owner`    | OpenAI account  | ⏳ Not testable yet |
| 3   | Grant the App Service access to the AI service  | `Microsoft.Authorization/roleAssignments/write`                  | `User Access Administrator` or `Owner` — **not `Contributor`** | OpenAI account  | ⏳ Testable in part |
| 4   | Allowlist the `vector` extension on PostgreSQL  | `Microsoft.DBforPostgreSQL/flexibleServers/configurations/write` | `Contributor` or `Owner`                                       | Postgres server | ✅ Verified         |

> The **Status** column tracks the access check against the subscription currently being
> validated. It is a per-deployment observation, not a property of the platform — every country
> deployment re-verifies against its own subscription.

## 0. Prerequisite: Azure Policy exemption (UNDP tenant)

Subscriptions governed by UNDP's tenant policy **deny AI resource creation outright**, before
RBAC is even the deciding factor. Creating an Azure OpenAI account fails with:

```text
Resource '<name>' was disallowed by policy. (Code: RequestDisallowedByPolicy,
Policy(s): UNDP Monitoring v2.0 — Reason: To deploy an AI resource, you must first obtain
approval from the Data team. Once approved, you can submit an Unall request and assign it
to the Cloud team to exempt your subscription from the deny AI resource deployment policy.)
```

**Remediation path (as stated by the policy):**

1. Obtain approval from the UNDP **Data team** to deploy an AI resource.
2. Submit an **Unall request** assigned to the **Cloud team**, to exempt the subscription from
   the deny-AI-resource-deployment policy.

This is a governance gate, not a permissions gate — no role assignment can bypass it. Treat it
as a lead-time item on the project plan: nothing in sections 1–3 can be provisioned or even
verified until the exemption lands.

> **This is very likely to recur per country deployment.** Any deployment hosted inside a
> UNDP-governed subscription will hit the same policy, so the exemption belongs in the
> deployment prerequisites checklist rather than being treated as a one-off.

## 1. Azure OpenAI account

One Cognitive Services account of kind `OpenAI`, SKU `S0`. Serves both model deployments —
they share a single endpoint (`AZURE_OPENAI_ENDPOINT`).

Pick a region where **both** required models are available (see below).

**⛔ Blocked (2026-07-29):** creation denied by `RequestDisallowedByPolicy` — see section 0.
Because ARM evaluates RBAC before policy, a policy denial (rather than `AuthorizationFailed`)
indicates the account-creation **permission** is most likely present; it is the policy that
blocks. Confirm with `az role assignment list` rather than assuming.

## 2. Model deployments

Two separate deployments on the account created in step 1:

| Deployment | Model                    | Type                 | Notes                                                                           |
| ---------- | ------------------------ | -------------------- | ------------------------------------------------------------------------------- |
| Chat       | `gpt-4o-mini`            | Standard (on-demand) | Sizing per `requirements.md`. No PTU reservation.                               |
| Embeddings | `text-embedding-3-large` | Standard (on-demand) | `dimensions=1024` is fixed in code and must match the `vector(1024)` DB column. |

> **Quota is not a permission.** A deployment can fail for insufficient model capacity in the
> region even with correct RBAC and no policy denial. That is a separate request to Azure, not
> an access grant from the account owner. See the failure-mode table under
> [Verifying access](#verifying-access) before reporting a blocker.

## 3. Role assignment: App Service → Azure OpenAI

Production authenticates **keylessly** via the App Service's system-assigned managed identity
(`DefaultAzureCredential`). `AZURE_OPENAI_API_KEY` stays unset in production.

- **Assign:** the built-in role `Cognitive Services OpenAI User`
- **To:** the App Service system-assigned managed identity
- **On:** the Azure OpenAI account

This is the permission most often missing, and it is blocking: `Contributor` can create the
resource and its deployments but **cannot create role assignments**. Without it the feature
cannot be deployed as designed.

**Testable now, without the policy exemption.** `Microsoft.Authorization/roleAssignments/write`
is not AI-specific, and the UNDP policy only denies AI resources. Assign any harmless role (for
example `Reader`) to your own user on an existing non-AI resource — the App Service, the storage
account, the Postgres server — then remove it. If that succeeds, permission #3 is confirmed; if
it fails with `AuthorizationFailed`, `User Access Administrator` is also missing. Worth checking
before the exemption request goes out, so both asks travel in the same conversation with the
Cloud team instead of surfacing serially.

## 4. PostgreSQL `vector` extension

Vector search runs on the existing PostgreSQL Flexible Server (pgvector), not on Azure AI
Search. The database migration executes `CREATE EXTENSION IF NOT EXISTS vector`, which fails
on Azure Flexible Server unless the extension is allowlisted first.

- **Server parameter:** `azure.extensions` must include `VECTOR`
- **Operation:** `Microsoft.DBforPostgreSQL/flexibleServers/configurations/write`
- pgvector does **not** require `shared_preload_libraries`, so only `azure.extensions` is involved.

**✅ Verified (2026-07-29):** `VECTOR` allowlisted on the Azure PostgreSQL instance, confirming
write access to the server parameters. Note that the allowlist is only the prerequisite — the
extension itself is created when the database migration runs `CREATE EXTENSION`, so pgvector is
not yet active on the server.

**Now codified.** That allowlist was originally applied by hand, which left the running server
correct and the template silent — any environment built fresh from Bicep would have failed the
migration with `extension "vector" is not available`. `infra/modules/postgres.bicep` now sets
`azure.extensions` via an `allowedExtensions` parameter defaulting to `['VECTOR']`, and it
applies **regardless of `enableChatbot`**: the migration runs on every deployment, so the
extension has to be allowlisted even where the assistant itself is switched off.

It is an allowlist, not an append — the value replaces whatever is set. Add entries to the
parameter rather than issuing a separate `az` command, or the next deployment reverts them.

## Not required

Do not provision these for this feature:

- **Azure AI Search** — retrieval uses pgvector. AI Search is only a future migration path if
  recall degrades at scale. (`requirements.md` still lists it as planned; that section predates
  the current design.)
- **Azure Document Intelligence** — PDF parsing runs locally via `pdf-parse`.
- **Additional Blob Storage** — corpus PDFs are read from the filesystem by the ingest CLI.

## Verifying access

### Three failure modes, three different owners

Do not collapse these into "we don't have access" — each is resolved by a different team, and
misattributing one sends the request down the wrong path.

| Symptom                                 | Actual cause                               | Resolved by                                       |
| --------------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| `RequestDisallowedByPolicy`             | Governance policy denies the resource type | UNDP Data team approval → Cloud team exemption    |
| `AuthorizationFailed`                   | Missing RBAC role                          | Subscription/resource-group owner                 |
| Capacity or quota error on a deployment | No TPM allocated for that model/region     | Azure quota request (support ticket / AI Foundry) |

They are also **sequential**: the policy exemption has to land before RBAC can be tested on an
AI resource, and RBAC has to pass before quota is observable. Front-load all three asks in the
same conversation rather than discovering them one at a time across three round trips.

### Commands

Read-only check of the roles currently held:

```bash
az role assignment list --assignee <upn-or-object-id> \
  --scope /subscriptions/<sub-id>/resourceGroups/<rg> -o table
```

A read-only check detects neither policy denials nor missing model quota. Once the exemption is
in place, validate end to end by creating the account, both deployments, and the role assignment
in the target region and resource group, then deleting them. Standard deployments are
consumption-billed, so a short-lived test resource costs effectively nothing.

**Cleanup:** deleting a Cognitive Services account leaves it **soft-deleted for 48 hours and
keeps the name reserved**, which will break a later Bicep deployment that reuses the name.
Either use a throwaway name for the test, or purge explicitly:

```bash
az cognitiveservices account purge -n <name> -g <rg> -l <region>
```

## References

- `docs/infrastructure/requirements.md` — Azure OpenAI sizing and cost assumptions
- `docs/development/environment-variables.md` — the chatbot environment variables these resources populate
- `docs/operations/runbook.md` — keyless-auth policy, embedding re-embed playbook
