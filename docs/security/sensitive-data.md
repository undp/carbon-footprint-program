# Sensitive Data Handling

This document describes what personal and sensitive data the platform stores, how it is protected at rest and in transit, and what compliance considerations apply given the platform's intended Latin American deployment context.

---

## Personal Data Inventory

The platform stores personal data in two primary models.

### `User` — Identity data

| Field       | Type              | Description                                                 |
| ----------- | ----------------- | ----------------------------------------------------------- |
| `email`     | String (unique)   | Primary contact and identifier                              |
| `firstName` | String (optional) | Given name                                                  |
| `lastName`  | String (optional) | Family name                                                 |
| `idpUserId` | String (unique)   | Identity provider subject identifier (`oid` or `sub` claim) |
| `idpName`   | String (optional) | Name of the identity provider                               |

This data originates from token claims issued by Microsoft Entra ID at the user's first login. The platform does not collect or manage passwords — credential management is fully delegated to Entra ID.

### `OrganizationData` — Organization representative data

| Field                    | Type              | Description                               |
| ------------------------ | ----------------- | ----------------------------------------- |
| `legalName`              | String            | Registered legal name of the organization |
| `tradeName`              | String (optional) | Trade or commercial name                  |
| `taxId`                  | String            | Organization tax identification number    |
| `address`                | String (optional) | Registered address                        |
| `representativeFullName` | String            | Full name of the legal representative     |
| `representativeTaxId`    | String            | Tax ID of the legal representative        |
| `representativePhone`    | String            | Phone number of the legal representative  |
| `representativeEmail`    | String            | Email address of the legal representative |

This data is entered by users and represents the legal identity of the organization and its authorized representative. It is considered personally identifiable information (PII) and, in some jurisdictions, tax information may carry additional protection obligations.

### Other models with implicit PII linkage

Most domain models (`CarbonInventory`, `Submission`, `ReductionProject`, etc.) carry `createdById` and `updatedById` foreign keys linking records to `User`. This means activity records are indirectly associated with identifiable individuals.

---

## Data Classification

| Category                | Examples                             | Classification                                               |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------ |
| Identity data           | Email, name                          | Personal data (PII)                                          |
| Tax identifiers         | `taxId`, `representativeTaxId`       | Personal/business data; may carry specific legal obligations |
| Contact data            | Phone, representative email          | Personal data (PII)                                          |
| Carbon measurement data | Inventories, emission lines, factors | Business data — not personal                                 |
| Certification data      | Submissions, badges                  | Business data — not personal                                 |
| System logs             | Request logs, error traces           | May contain PII by reference (user ID, email in errors)      |

The platform does **not** store:

- Financial account data or payment information
- Health or medical records
- Biometric data
- Minors' data
- Special category data as defined by GDPR Art. 9

---

## Data Protection at Rest

### Database

Azure Database for PostgreSQL Flexible Server encrypts all data at rest using **AES-256** with Microsoft-managed keys by default. This applies to all tables, indexes, and backups automatically, with no application-side configuration required.

No application-layer field-level encryption is implemented. PII fields (`email`, `representativeFullName`, `taxId`, etc.) are stored as plaintext strings in the database. Protection relies entirely on:

- Azure's platform-level AES-256 encryption
- Network-level controls (firewall rules, no public endpoint without IP allowlist)
- Application-level access control (RBAC prevents unauthorized API access)

**Known gap:** Customer-managed keys (CMK) are not configured. If a deployment context requires CMK for compliance, this must be added to the Bicep configuration.

### File Storage

Azure Blob Storage also encrypts all data at rest using **AES-256** with Microsoft-managed keys. Storage accounts are configured with `supportsHttpsTrafficOnly: true` and `minimumTlsVersion: 'TLS1_2'`.

---

## Data Protection in Transit

| Channel                     | Protection                                                         |
| --------------------------- | ------------------------------------------------------------------ |
| Client → API                | HTTPS enforced by Azure App Service / Front Door (TLS 1.2 minimum) |
| API → PostgreSQL            | `sslmode=require` in connection string; TLS enforced               |
| API → Blob Storage          | HTTPS-only (`supportsHttpsTrafficOnly: true`); TLS 1.2 minimum     |
| Client → Blob Storage (SAS) | HTTPS enforced by storage account configuration                    |
| GitHub Actions → Azure      | OIDC federation; no credentials over the wire                      |

---

## Data Retention

| Data type                  | Staging                              | Production                                |
| -------------------------- | ------------------------------------ | ----------------------------------------- |
| User and organization data | Disposable; periodic resets          | Retained for platform lifetime            |
| Carbon inventory data      | Disposable; periodic resets          | Long-term retention (regulatory evidence) |
| Uploaded files             | Purged every 90 days; alert at 40 GB | Permanent; TB-scale over time             |
| Application logs           | 30 days                              | 90 days                                   |
| Database backups           | Per Azure defaults (7 days PITR)     | PITR enabled; aligned with RPO ≤ 15 min   |

No automated data deletion or anonymization pipeline is currently implemented. Data subject requests (access, deletion, portability) must be fulfilled manually by administrators using direct database access.

---

## Compliance Considerations

The platform is designed for country-level deployments across Latin America. Each country deployment operates under its own data protection legal framework. The project team does not provide legal compliance certification; the deploying country's IT and legal teams are responsible for verifying and declaring compliance.

### Applicable legal frameworks by country

| Country   | Primary data protection law                                                             |
| --------- | --------------------------------------------------------------------------------------- |
| Mexico    | LFPDPPP (Ley Federal de Protección de Datos Personales en Posesión de los Particulares) |
| Colombia  | Ley 1581/2012 (Estatutaria de Protección de Datos Personales)                           |
| Argentina | Ley 25.326 (Ley de Protección de los Datos Personales)                                  |
| Brazil    | LGPD (Lei Geral de Proteção de Dados Pessoais)                                          |
| Chile     | Ley 19.628 (Ley sobre Protección de la Vida Privada)                                    |
| Peru      | Ley 29733 (Ley de Protección de Datos Personales)                                       |

All of these frameworks share core principles with GDPR: lawful basis for processing, purpose limitation, data minimization, data subject rights, and security obligations.

### What the platform provides

- **Purpose limitation:** PII is collected only to identify users and their organizational affiliations. It is not used for marketing, profiling, or secondary purposes.
- **Data minimization:** User fields are populated from IDP token claims; no additional PII is solicited beyond what is operationally required.
- **Access control:** Role-based authorization limits who can read PII to authorized users within the same organization or ADMIN/SUPERADMIN roles.
- **Security:** Encryption at rest (AES-256) and in transit (TLS 1.2+) for all storage layers.
- **Auditability:** `createdById`/`updatedById`/`createdAt`/`updatedAt` on all records.

### What the platform does NOT provide (deployment team responsibility)

- Privacy notice or consent mechanism
- Data subject request workflow (access, deletion, portability)
- Data Processing Agreement (DPA) with UNDP or any third party
- Privacy Impact Assessment (PIA/DPIA)
- Data breach notification workflow
- Legal basis documentation for each processing activity
- CMK (customer-managed keys) for encryption if required by local law

---

## Known Gaps and Recommendations

| Gap                               | Risk                                                                | Recommendation                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| No field-level encryption for PII | If DB is breached, PII is readable as plaintext                     | Consider Prisma middleware encryption for `email`, `taxId`, `representativeTaxId` fields for high-sensitivity deployments |
| No automated data deletion        | Violates "right to erasure" requests under most Latin American laws | Implement a soft-delete + anonymization flow for User and OrganizationData                                                |
| No data subject request workflow  | Compliance gap for all target countries                             | Build an admin tool or runbook for fulfilling access/deletion requests                                                    |
| No privacy notice UI              | Required by all target country laws                                 | Add a privacy policy page and acceptance flow to the frontend                                                             |
| Logs may reference PII            | Error logs may contain email or idpUserId                           | Ensure log retention and access is restricted; consider masking in future                                                 |

---

## Chatbot Conversation Persistence and Retention

The Huella Latam chatbot persists conversations to power per-user history and right-to-be-forgotten flows.

**Tables (all under `public` schema, prefixed `chatbot_`):**

- `chatbot_chat_conversation` — one row per conversation, scoped to `user_id` (authenticated) or `session_id` (anonymous). Both columns are nullable; the database CHECK constraint allows the `(NULL, NULL)` post-deletion state produced by `ON DELETE SET NULL` on `user_id`. Application code guarantees the exactly-one-of invariant on INSERT.
- `chatbot_chat_message` — one row per message, cascaded from `chatbot_chat_conversation`.
- `chatbot_corpus_*` — RAG corpus tables, dormant in foundation.

**Identity scoping:**

- Authenticated callers: `user_id` is set to the resolved `currentUser.id`.
- Anonymous callers: `session_id` is the value of a signed `chatbot_session_id` cookie, minted on first `POST /api/chatbot/message`.

**Retention:**

- Each conversation row carries `expires_at = created_at + 30 days` (`CHATBOT_CONVERSATION_TTL_DAYS`). The value is set once at creation and is **not** refreshed on subsequent messages.
- The pg_cron job that purges expired rows is **deferred** to a separate infra change. Until it lands, expired rows accumulate and are removed manually or via the right-to-be-forgotten endpoint.

**Cookie security:**

- Name: `chatbot_session_id`. Signed with `COOKIE_SECRET` via `@fastify/cookie`.
- `HttpOnly`, `SameSite=Lax`, `Path=/api/chatbot`, `Max-Age=2592000` (sliding 30 days, refreshed on each interaction).
- `Secure` is set when `NODE_ENV=production` and omitted otherwise (to permit local HTTP development).
- A tampered cookie (signature invalid) is treated as no session and a fresh one is minted.

**Right to be forgotten:**

- `DELETE /api/chatbot/conversations/me` deletes every conversation row scoped to the caller identity, idempotently. The cascade removes all message rows.
- For anonymous callers, the response also clears the `chatbot_session_id` cookie via `Set-Cookie: chatbot_session_id=; Max-Age=0; …`.
- For authenticated callers, only `user_id`-scoped conversations are removed — earlier conversations created under an anonymous `session_id` are not touched by the user-id path.
