## ADDED Requirements

### Requirement: Conversation table stores anonymous and authenticated sessions

The system SHALL persist chat conversations in the `chatbot_chat_conversation` table. Each row SHALL be scoped to one of: an authenticated `user_id` (BIGINT, foreign key to `user.id`) or an anonymous `session_id` (TEXT). Both columns SHALL be nullable. The CHECK constraint SHALL be declared as:

```sql
CHECK (
  (user_id IS NOT NULL AND session_id IS NULL)
  OR (user_id IS NULL AND session_id IS NOT NULL)
  OR (user_id IS NULL AND session_id IS NULL)
)
```

The `(NULL, NULL)` case is permitted by the database **only as the result of `ON DELETE SET NULL` on the `user_id` foreign key** (anonymization upon user deletion). Application-level invariant: on INSERT, application code SHALL guarantee exactly one of `user_id` / `session_id` is set; the relaxed CHECK exists solely to tolerate the post-deletion anonymized state, not to broaden insertion semantics.

#### Scenario: Authenticated conversation

- **WHEN** an authenticated user sends their first chat message and the system creates a conversation row
- **THEN** the row SHALL have `user_id` populated, `session_id` NULL, and the CHECK constraint SHALL pass

#### Scenario: Anonymous conversation

- **WHEN** an anonymous visitor sends their first chat message and the system creates a conversation row
- **THEN** the row SHALL have `session_id` populated, `user_id` NULL, and the CHECK constraint SHALL pass

#### Scenario: Both columns set rejected

- **WHEN** an attempt is made to insert a row with both `user_id` and `session_id` populated
- **THEN** the database SHALL reject the insert with a CHECK constraint violation

#### Scenario: Neither column set is allowed only as a post-deletion state

- **WHEN** both `user_id` and `session_id` are NULL on a row
- **THEN** the row SHALL be accepted by the database CHECK constraint, AND application code SHALL NOT produce this state on INSERT — it arises only as the result of `ON DELETE SET NULL` on the `user_id` foreign key

### Requirement: Conversation foreign keys preserve history on referenced entity deletion

The `chatbot_chat_conversation.user_id` foreign key to `user.id` and the `chatbot_chat_conversation.organization_id` foreign key to `organization.id` SHALL both have `ON DELETE SET NULL` semantics. Deleting a referenced user or organization SHALL preserve the conversation row with the corresponding column set to NULL, anonymizing the historical record for audit and analytics purposes. This aligns with the repo's existing pattern for nullable user/organization foreign keys (e.g., `country_parameter.created_by_id`, `carbon_inventory.organization_id` when nullable).

The referential action SHALL be declared **explicitly at both layers** — the Prisma `@relation` annotation SHALL include `onDelete: SetNull`, and the generated migration SQL SHALL include `ON DELETE SET NULL` on the foreign-key constraint. The spec SHALL NOT rely on the ORM's default referential-action behavior for nullable relations: Prisma's default for optional relations has shifted across major versions (Cascade in 2.x, SetNull from 3.x onward), and a country-agnostic spec must be self-contained against that drift.

#### Scenario: User deletion anonymizes existing conversations

- **WHEN** a `user` row referenced by an authenticated `chatbot_chat_conversation.user_id` is deleted
- **THEN** the conversation row SHALL persist and its `user_id` SHALL be set to NULL

#### Scenario: Organization deletion de-associates existing conversations

- **WHEN** an `organization` row referenced by `chatbot_chat_conversation.organization_id` is deleted
- **THEN** the conversation row SHALL persist and its `organization_id` SHALL be set to NULL

#### Scenario: Prisma schema declares onDelete: SetNull explicitly

- **WHEN** the Prisma schema definition for `ChatbotChatConversation` is inspected
- **THEN** the `@relation` annotation on the `user` field AND the `@relation` annotation on the `organization` field SHALL each include the literal `onDelete: SetNull` argument — neither relation SHALL omit `onDelete` and rely on the ORM default

#### Scenario: Migration declares SET NULL constraints

- **WHEN** the migration SQL for `chatbot_chat_conversation` is inspected
- **THEN** the foreign key constraints for `user_id` and `organization_id` SHALL specify `ON DELETE SET NULL`

### Requirement: Conversation row carries retention, organization, and IP-hash columns

Each `chatbot_chat_conversation` row SHALL include nullable `organization_id` (BIGINT, foreign key to `organization.id`), nullable `ip_hash` (TEXT), and non-nullable `expires_at` (TIMESTAMP). Foundation does not write `organization_id` or `ip_hash` — both columns SHALL ship as NULL on every row created in this change. `expires_at` SHALL be set at row creation by application code (see retention requirement below).

#### Scenario: Foundation conversations have NULL organization and IP hash

- **WHEN** a conversation row is created in code paths shipped by this change
- **THEN** `organization_id` SHALL be NULL and `ip_hash` SHALL be NULL on the resulting row

#### Scenario: Future writes to organization_id are accepted

- **WHEN** a future change updates a conversation row to set `organization_id` to a valid `organization.id` value
- **THEN** the database SHALL accept the update

#### Scenario: Grep test enforces no writes to dormant columns

- **WHEN** the test `apps/api/test/features/chatbot/lint/noWritesToDormantColumns.test.ts` runs
- **THEN** it SHALL execute `grep -rE '(organization_id|ip_hash|organizationId|ipHash)\s*[:=]' apps/api/src/features/chatbot/` from the repo root and SHALL fail if any match is returned, enforcing that no foundation handler, service, or helper writes to the dormant `organization_id` / `ip_hash` columns of `chatbot_chat_conversation`. The grep SHALL cover both the raw SQL column names (snake_case) AND the Prisma Client field names (camelCase) so writes via either path — `prisma.chatbotChatConversation.create({ data: { organizationId, ipHash } })` and raw SQL — are caught

### Requirement: Message table records role, content, and per-turn metrics

The system SHALL persist chat messages in the `chatbot_chat_message` table. Each row SHALL include: `id` (BIGINT, primary key), `conversation_id` (BIGINT, foreign key to `chatbot_chat_conversation.id`, ON DELETE CASCADE), `role` (`chatbot_chat_message_role` enum), `content` (TEXT), `tokens_used` (INTEGER, nullable), `latency_ms` (INTEGER, nullable), `truncated` (BOOLEAN, default `false`), `sources_cited` (JSONB, default `'[]'::jsonb`), and `created_at` (TIMESTAMP, default `now()`).

`tokens_used` represents the **per-turn cost** and SHALL be attached to the assistant message at finalization (`inputTokens + outputTokens` reported by the LLM provider). User messages SHALL have `tokens_used = NULL`. This convention guarantees that summing `tokens_used` across all messages in a conversation yields the total cost without double-counting input tokens.

#### Scenario: User message persistence

- **WHEN** the streaming endpoint persists the user message at the start of a turn
- **THEN** the row SHALL have `role = USER`, `content` set to the user input, `tokens_used = NULL`, `truncated = false`, and `sources_cited = '[]'::jsonb`

#### Scenario: Assistant message persistence on successful turn

- **WHEN** the streaming endpoint finalizes the assistant message after the LLM stream completes
- **THEN** the row SHALL have `role = ASSISTANT`, `content` set to the accumulated stream output, `tokens_used` set to the per-turn total (`inputTokens + outputTokens`), `latency_ms` set to a non-negative integer, and `truncated = false`

#### Scenario: Assistant message persistence on mid-turn disconnect

- **WHEN** the streaming endpoint finalizes the assistant message via the disconnect handler before the LLM stream completed
- **THEN** the row SHALL have `truncated = true` and `content` set to whatever accumulated before the client disconnected (which MAY be the empty string)

#### Scenario: Cascade delete on conversation removal

- **WHEN** a `chatbot_chat_conversation` row is deleted
- **THEN** all `chatbot_chat_message` rows referencing it via `conversation_id` SHALL also be deleted

### Requirement: Assistant message finalization is idempotent via conditional UPDATE

The system SHALL guarantee that the success-path finalization of the assistant message and the mid-stream disconnect finalization are mutually exclusive at the database level via the invariant: `latency_ms IS NOT NULL` ⟺ the row was finalized successfully. The success path SHALL always set `latency_ms` to a non-negative integer in the same UPDATE that writes the final content and `tokens_used`. The disconnect handler SHALL emit a conditional UPDATE whose WHERE clause filters on `latency_ms IS NULL`, so it becomes a no-op if the success path has already finalized the row. No other code path SHALL set `latency_ms`.

#### Scenario: Success-path finalization sets latency_ms

- **WHEN** the LLM stream completes and the success path UPDATEs the assistant row
- **THEN** `latency_ms` SHALL be set to a non-negative integer in the same UPDATE that writes the final `content` and `tokens_used`

#### Scenario: Disconnect finalization is conditional

- **WHEN** the `reply.raw.on('close')` handler fires
- **THEN** it SHALL emit `UPDATE chatbot_chat_message SET truncated = true, content = $partial WHERE id = $assistantRowId AND latency_ms IS NULL`, which is a no-op if the success path already finalized the row

#### Scenario: No race condition produces inconsistent state

- **WHEN** the success path and the disconnect handler both fire concurrently for the same row
- **THEN** the final database state SHALL be deterministic: either `truncated = false` with full content (success won the race) or `truncated = true` with partial content (disconnect won), but never partial content with `latency_ms` set

### Requirement: ChatMessageRole enum encodes the four canonical roles

The system SHALL define a Postgres enum named `chatbot_chat_message_role` with exactly four values: `USER`, `ASSISTANT`, `SYSTEM`, `TOOL`. The Prisma schema SHALL declare the enum as `ChatMessageRole` and re-export it via `@repo/database/enums`.

#### Scenario: Enum accepts each canonical value

- **WHEN** a row is inserted into `chatbot_chat_message` with `role` set to any of `USER`, `ASSISTANT`, `SYSTEM`, `TOOL`
- **THEN** the database SHALL accept the insert

#### Scenario: Enum rejects non-canonical value

- **WHEN** a row is inserted with `role` set to a value outside the four canonical roles
- **THEN** the database SHALL reject the insert with an enum-violation error

#### Scenario: Enum is exported from @repo/database/enums

- **WHEN** application code imports `ChatMessageRole` from `@repo/database/enums`
- **THEN** the imported value SHALL be a TypeScript enum exposing exactly `USER`, `ASSISTANT`, `SYSTEM`, `TOOL`

### Requirement: Tables use the `chatbot_` prefix in the `public` schema

All chatbot-related tables introduced by this change SHALL live in the `public` schema with the `chatbot_` prefix on their snake_case table name. The Prisma schema SHALL NOT enable the `multiSchema` preview feature in this change.

#### Scenario: Tables exist with prefixed names in public schema

- **WHEN** the migration runs against an empty database
- **THEN** the database SHALL contain tables `chatbot_chat_conversation`, `chatbot_chat_message`, `chatbot_corpus_source`, `chatbot_corpus_chunk`, `chatbot_corpus_ingest_run` — all in the `public` schema

#### Scenario: multiSchema is not enabled

- **WHEN** the Prisma schema is inspected
- **THEN** `previewFeatures` SHALL NOT include `"multiSchema"` and the `datasource db` block SHALL NOT include a `schemas` field

#### Scenario: All chatbot-domain tables in public schema follow the prefix convention

- **WHEN** `information_schema.tables` is queried for tables in the `public` schema that belong to the chatbot domain (the five tables introduced by this change)
- **THEN** every returned `table_name` SHALL start with the `chatbot_` prefix

### Requirement: Conversations expire 30 days after creation and the value is not refreshed

The system SHALL set `chatbot_chat_conversation.expires_at` at row creation to `created_at + CHATBOT_CONVERSATION_TTL_DAYS` days, where `CHATBOT_CONVERSATION_TTL_DAYS = 30`. The constant SHALL live in `apps/api/src/config/constants.ts`. `expires_at` SHALL NOT be refreshed when subsequent messages are appended to the conversation. Enforcement of expiration (deletion of expired rows via `pg_cron`) is deferred to a separate infra change and is NOT in scope here.

#### Scenario: New conversation gets 30-day expires_at

- **WHEN** a conversation row is created
- **THEN** `expires_at` SHALL equal `created_at + 30 days` within database timestamp precision

#### Scenario: expires_at is not refreshed on subsequent messages

- **WHEN** a new message is appended to an existing conversation
- **THEN** the conversation's `expires_at` SHALL remain at its original value

### Requirement: Conversations are created lazily on first user message

The system SHALL create a `chatbot_chat_conversation` row only on `POST /api/chatbot/message`, only when the resolved caller identity (`userId` or `sessionId`) has no active conversation. "Active" means `expires_at > NOW()`. Subsequent messages from the same identity SHALL append to the same conversation row until it expires. The `DELETE /api/chatbot/conversations/me` endpoint SHALL NOT create conversations.

#### Scenario: First message creates conversation

- **WHEN** a caller with no prior conversation row sends their first chat message
- **THEN** the system SHALL create a new conversation row and persist the user message under it

#### Scenario: Subsequent message reuses active conversation

- **WHEN** a caller with an existing active conversation sends another chat message
- **THEN** the system SHALL persist the new user message under the existing conversation row, not create a new one

#### Scenario: Expired conversation triggers fresh row

- **WHEN** a caller whose only conversation row has `expires_at <= NOW()` sends a chat message
- **THEN** the system SHALL create a new conversation row rather than reusing the expired one

#### Scenario: Cookie-only request does not create a conversation

- **WHEN** an anonymous client makes a request that establishes the `chatbot_session_id` cookie but does not send a chat message
- **THEN** the system SHALL NOT create a conversation row

#### Scenario: Turn started while active completes after expires_at

- **WHEN** a turn begins on a conversation whose `expires_at > NOW()` at turn start, and the LLM stream completes after that conversation's `expires_at` has elapsed
- **THEN** the turn's user and assistant messages SHALL persist on that same conversation row, and the system SHALL NOT create a new conversation mid-turn — "active" is evaluated at turn start, not at completion

### Requirement: Lazy creation, user message insert, and empty assistant insert execute in a single transaction guarded by an identity-scoped advisory lock

A TOCTOU race exists where two concurrent first-message requests for the same identity could each see "no active conversation" and each insert one. Wrapping the lookup-then-insert in a single Prisma interactive transaction at PostgreSQL's default `READ COMMITTED` isolation level is **not sufficient on its own** to close this race: each transaction's snapshot is independent, both see zero rows on the lookup, and both inserts succeed. To guarantee a single-row outcome at the database level, the handler SHALL combine the interactive transaction with a Postgres transaction-scoped advisory lock keyed to the caller identity:

1. Open a Prisma interactive transaction: `prisma.$transaction(async (tx) => { ... })`.
2. As the FIRST statement inside the transaction (BEFORE any read or write touches `chatbot_chat_conversation`), acquire the advisory lock: `SELECT pg_advisory_xact_lock(hashtextextended($key, 0))` where `$key` is the literal string `'chatbot:user:' || userId::text` for authenticated callers and `'chatbot:session:' || sessionId` for anonymous callers. The lock auto-releases on commit or rollback.
3. Under the held lock, execute the lazy-create lookup, the conversation INSERT (when needed), the user message INSERT, and the empty assistant message INSERT.
4. Commit the transaction.

Concurrent transactions for the same identity serialize on this lock — the second waiter blocks on `pg_advisory_xact_lock` until the first commits, then proceeds, observes the conversation row inserted by the first, and reuses it. Different identities never block each other because the lock key is identity-scoped. The interactive transaction provides atomicity (all four writes succeed together or none do); the advisory lock provides serialization (concurrent first-message turns for the same identity become deterministic).

The LLM provider invocation and the assistant row finalization (with content, tokens, latency) SHALL execute **outside** the transaction — keeping the transaction (and its advisory lock) open for the duration of an LLM stream is unacceptable.

#### Scenario: Concurrent first-message requests do not create duplicate conversations

- **WHEN** two `POST /api/chatbot/message` requests arrive concurrently for the same caller identity, neither of which has an active conversation
- **THEN** the database SHALL end up with exactly one new `chatbot_chat_conversation` row for that identity — the second request blocks on the advisory lock until the first commits, then observes and reuses the row created by the first

#### Scenario: Concurrent first-message requests do not produce duplicate conversations under load

- **WHEN** N=10 `POST /api/chatbot/message` requests are issued concurrently via `Promise.allSettled` for **a freshly-minted caller identity** — a test-generated `userId` or `sessionId` UUID for which `SELECT COUNT(*) FROM chatbot_chat_conversation WHERE [identity column] = [identity value]` returns 0 immediately before the requests fire (this guards the post-condition against historical / expired rows from earlier test runs or other identities that share the column)
- **THEN** after all settle, the same `SELECT COUNT(*)` for that identity SHALL return exactly 1 — the deduplication invariant is the load-bearing assertion of this scenario
- **AND** under stable test infrastructure (no DB connection drops, no client cancellations, no timeouts), every request SHALL terminate with HTTP 200 plus a complete SSE stream — the advisory-lock serialization queues concurrent first-message turns for the same identity at the database level, so no transaction needs to retry. Transient infrastructure failures MAY produce non-200 outcomes for individual requests; in that case the deduplication invariant SHALL still hold (the only acceptable failure shapes are zero-or-one new conversation row, never two)

#### Scenario: Different identities do not serialize on each other

- **WHEN** two concurrent `POST /api/chatbot/message` requests arrive for two distinct caller identities, neither of which has an active conversation
- **THEN** the two transactions SHALL acquire distinct advisory locks (computed from distinct keys) and SHALL NOT block each other — both inserts SHALL be observable in the database with overlapping wall-clock execution windows

#### Scenario: Advisory lock is acquired before the lookup

- **WHEN** the streaming handler enters the interactive transaction
- **THEN** the first statement issued on the transaction client SHALL be `SELECT pg_advisory_xact_lock(hashtextextended($key, 0))` with the identity-scoped key; the conversation lookup, conversation insert, user-message insert, and empty-assistant-message insert SHALL all execute strictly after this statement completes

#### Scenario: Provider invocation runs outside the transaction

- **WHEN** the streaming handler invokes `LLMProvider.streamCompletion` for a turn
- **THEN** the surrounding Prisma interactive transaction SHALL have already committed (covering advisory lock acquisition + lazy-create + user message + empty assistant message), so the streaming portion does not hold a long-lived transaction or advisory lock

#### Scenario: Assistant finalization runs outside the transaction

- **WHEN** the streaming handler updates the assistant message row with the final content, `tokens_used`, and `latency_ms` after the stream completes
- **THEN** the update SHALL execute as a standalone Prisma write, not inside the lazy-create transaction (which has already committed)

### Requirement: Indexes support session lookup, retention sweep, and future rate limiting

The migration SHALL create the following indexes on the chatbot tables:

- `chatbot_chat_conversation(session_id, created_at DESC)` — anonymous identity lookup and future rate-limit window scans
- `chatbot_chat_conversation(user_id, expires_at)` — authenticated identity lookup with active filter
- `chatbot_chat_conversation(expires_at)` — retention sweep
- `chatbot_chat_conversation(ip_hash, created_at DESC)` — V1 IP-based rate limiting (column unwritten in this change)
- `chatbot_chat_message(conversation_id, created_at)` — turn ordering within a conversation

#### Scenario: Indexes exist after migration

- **WHEN** the migration runs against an empty database
- **THEN** the five indexes above SHALL exist on their respective tables

### Requirement: Session cookie carries strict security properties

The signed session cookie used to identify anonymous chatbot callers SHALL be set with all of the following properties:

- `httpOnly` SHALL be `true`
- `sameSite` SHALL be `none` when `NODE_ENV=production` (the web app and API are served cross-site, so `Lax` would drop the cookie on `credentials: "include"` requests), and `lax` otherwise (local dev, where the Vite proxy keeps requests same-origin)
- `secure` SHALL be `true` when `NODE_ENV=production` (required by `SameSite=None`), and `false` otherwise (to permit local development over HTTP)
- the value SHALL be signed using `COOKIE_SECRET` via `@fastify/cookie`'s signing API
- the cookie name SHALL be `chatbot_session_id`
- `path` SHALL be `/api/chatbot`
- `Max-Age` SHALL be 30 days, refreshed (sliding) on each request that the identity preHandler reads or writes the cookie

#### Scenario: Cookie set on first anonymous request

- **WHEN** an anonymous client posts a chat message without an existing `chatbot_session_id` cookie and `NODE_ENV` is `development`
- **THEN** the response SHALL include a `Set-Cookie` header for `chatbot_session_id` with attributes `HttpOnly`, `SameSite=Lax`, `Path=/api/chatbot`, `Max-Age=2592000`, and a signed value, and the header SHALL NOT include `Secure`

#### Scenario: Cookie marked SameSite=None; Secure in production

- **WHEN** the cookie is set with `NODE_ENV=production`
- **THEN** the `Set-Cookie` header SHALL include `SameSite=None` and `Secure` (for the cross-site deployment), in addition to all other attributes above

#### Scenario: Tampered cookie rejected and replaced

- **WHEN** an anonymous client sends a chat message carrying a `chatbot_session_id` cookie whose signature does not validate against `COOKIE_SECRET`
- **THEN** the system SHALL treat the request as having no session identity, generate a fresh `session_id`, and set a new signed cookie in the response

#### Scenario: Sliding refresh on each interaction

- **WHEN** an anonymous client with a valid signed cookie sends a chat message after some elapsed time
- **THEN** the response SHALL include a `Set-Cookie` header that re-issues `chatbot_session_id` with the same value and a refreshed `Max-Age=2592000`

### Requirement: Identity preHandler resolves caller without 401-ing

A feature-local preHandler SHALL run on chatbot endpoints to resolve caller identity into `request.chatbotIdentity` as either `{ kind: "user", userId }` or `{ kind: "session", sessionId }`. The preHandler SHALL prefer `request.currentUser.id` when set (populated by the existing global authentication and user-resolve plugins), fall back to a valid signed `chatbot_session_id` cookie, and otherwise — only on identity-creating endpoints (`POST /api/chatbot/message`) — generate a new session id and set the `chatbot_session_id` cookie. The preHandler SHALL NOT respond with HTTP 401 when no auth is present, on any chatbot endpoint.

#### Scenario: Authenticated caller resolved by user_id

- **WHEN** the request carries a valid bearer token and `request.currentUser` is populated
- **THEN** `request.chatbotIdentity` SHALL be `{ kind: "user", userId: <currentUser.id> }`

#### Scenario: Anonymous caller resolved by valid cookie

- **WHEN** the request has no auth but carries a valid signed `chatbot_session_id` cookie
- **THEN** `request.chatbotIdentity` SHALL be `{ kind: "session", sessionId: <cookie value> }`

#### Scenario: Anonymous caller without cookie on identity-creating endpoint

- **WHEN** the request has no auth and no cookie, on `POST /api/chatbot/message`
- **THEN** the preHandler SHALL generate a fresh UUID v4 `session_id`, set the signed cookie, and populate `request.chatbotIdentity = { kind: "session", sessionId: <new value> }`

#### Scenario: No identity on non-identity-creating endpoint

- **WHEN** the request has no auth and no cookie, on `DELETE /api/chatbot/conversations/me`
- **THEN** the preHandler SHALL leave `request.chatbotIdentity` undefined and SHALL NOT respond with HTTP 401
