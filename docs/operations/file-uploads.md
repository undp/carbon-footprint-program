# File Upload Limits

Operational reference for configuring the maximum and minimum byte
range accepted for any file uploaded through the platform, and the
per-use-case extension/MIME allowlist.

For the security rationale (why these layers exist and what each one
defends against), see [`../security/hardening.md#file-upload-security`](../security/hardening.md#file-upload-security).

---

## Sources of truth

| Surface                         | What it controls                                                          | Where to change it                                                                                |
| ------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `system_parameter` rows         | Global min / max bytes (`FILE_UPLOAD_MIN_BYTES`, `FILE_UPLOAD_MAX_BYTES`) | `packages/database/src/prisma/seeds/data/<dataset>/systemParameters.json` (run the seed to apply) |
| `FILE_UPLOAD_POLICIES` constant | Per-`FileType` extension and MIME allowlist, optional `maxBytes` ceiling  | `packages/constants/src/files.ts`                                                                 |
| Bicep deployment parameter      | Documentation-only mirror of the global max                               | `infra/params/main.<env>.bicepparam` → `storageFileUploadMaxBytes`                                |

All three MUST agree. The application reads `system_parameter` at
runtime, so changing the seed (followed by re-seeding) is the only
change that affects live behavior; the Bicep param exists so the
deployment file stays self-documenting and a future infra-level
sweep (Event Grid, lifecycle policy) can reuse the value.

---

## Updating the global max

1. Edit both `base/systemParameters.json` and `testing/systemParameters.json`
   in `packages/database/src/prisma/seeds/data/`. Update both `value`
   and (if appropriate) `min` / `max`. Keep the units in bytes.
2. Update `storageFileUploadMaxBytes` in
   `infra/params/main.development.bicepparam` (and any other env
   param files) to match.
3. Re-run the seed against the target database: `pnpm db:seed` or the
   command your environment uses to apply `systemParameters.json`.
4. The API caches the value via `getFileUploadLimits` per request;
   no application restart is required, the next request picks the new
   value up.

---

## Adjusting an allowlist or per-use-case cap

Add or modify the matching policy in `packages/constants/src/files.ts`.
The map is consumed by both the API (`apps/api/src/features/files/helpers/getFileUploadLimits.ts`)
and the web client (`apps/web/src/utils/buildAcceptFromPolicy.ts` and
`useFileUploadLimits`), so changes propagate after a rebuild — no
runtime configuration.

Effective max per request = `min(global FILE_UPLOAD_MAX_BYTES, policy.maxBytes ?? Infinity)`.

---

## What is NOT enforced at the infrastructure layer

- Azure Storage Accounts have no per-blob size limit setting; the
  hard service ceiling is 5 TiB per block blob.
- SAS URLs cannot carry a `Content-Length-Range` constraint.
- The Bicep storage module accepts `fileUploadMaxBytes` for
  documentation and future use only — today it is not wired to any
  Azure resource property.

This means a client with a valid SAS could PUT a larger payload than
declared. `confirmUpload` will reject it via blob HEAD validation and
delete the blob; any orphan that never reaches `confirmUpload` will
linger until the application-level cleanup work in the plan's fase 2
ships.
