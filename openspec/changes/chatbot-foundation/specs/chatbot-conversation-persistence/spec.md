## ADDED Requirements

### Requirement: Conversation table stores anonymous and authenticated sessions

The system SHALL persist chat conversations in the `chatbot_chat_conversation` table. Each row SHALL be scoped to exactly one of: an authenticated `user_id` (BIGINT, foreign key to `user.id`) or an anonymous `session_id` (TEXT). Both columns SHALL be nullable, and a CHECK constraint SHALL enforce that exactly one of the two is set per row.

#### Scenario: Authenticated conversation

- **WHEN** an authenticated user sends their first chat message and the system creates a conversation row
- **THEN** the row SHALL have `user_id` populated, `session_id` NULL, and the CHECK constraint SHALL pass

#### Scenario: Anonymous conversation

- **WHEN** an anonymous visitor sends their first chat message and the system creates a conversation row
- **THEN** the row SHALL have `session_id` populated, `user_id` NULL, and the CHECK constraint SHALL pass

#### Scenario: Both columns set rejected

- **WHEN** an attempt is made to insert a row with both `user_id` and `session_id` populated
- **THEN** the database SHALL reject the insert with a CHECK constraint violation

#### Scenario: Neither column set rejected

- **WHEN** an attempt is made to insert a row with both `user_id` and `session_id` NULL
- **THEN** the database SHALL reject the insert with a CHECK constraint violation

### Requirement: Conversation foreign keys preserve history on referenced entity deletion

The `chatbot_chat_conversation.user_id` foreign key to `user.id` and the `chatbot_chat_conversation.organization_id` foreign key to `organization.id` SHALL both have `ON DELETE SET NULL` semantics. Deleting a referenced user or organization SHALL preserve the conversation row with the corresponding column set to NULL, anonymizing the historical record for audit and analytics purposes. This aligns with the repo's existing pattern for nullable user/organization foreign keys (e.g., `country_parameter.created_by_id`, `carbon_inventory.organization_id` when nullable), which rely on Prisma 7's default `SetNull` behavior for nullable relations.

#### Scenario: User deletion anonymizes existing conversations

- **WHEN** a `user` row referenced by an authenticated `chatbot_chat_conversation.user_id` is deleted
- **THEN** the conversation row SHALL persist and its `user_id` SHALL be set to NULL

#### Scenario: Organization deletion de-associates existing conversations

- **WHEN** an `organization` row referenced by `chatbot_chat_conversation.organization_id` is deleted
- **THEN** the conversation row SHALL persist and its `organization_id` SHALL be set to NULL

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

#### Scenario: API source contains no writes to organization_id or ip_hash

- **WHEN** the application source under `apps/api/src/` is reviewed for writes that set `organization_id` or `ip_hash` on `chatbot_chat_conversation` (whether via Prisma model accessors or raw SQL)
- **THEN** there SHALL be no service, handler, or helper in this change that writes either column

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

### Requirement: Lazy creation, user message insert, and empty assistant insert execute in a single transaction

To avoid a TOCTOU race where two concurrent first-message requests for the same identity each see "no active conversation" and each create one, the handler SHALL execute the lazy-create lookup, the conversation INSERT (when needed), the user message INSERT, and the empty assistant message INSERT inside a single Prisma interactive transaction (`prisma.$transaction(async (tx) => { ... })`). The LLM provider invocation and the assistant row finalization (with content, tokens, latency) SHALL execute **outside** that transaction — keeping a transaction open for the duration of an LLM stream is unacceptable.

#### Scenario: Concurrent first-message requests do not create duplicate conversations

- **WHEN** two `POST /api/chatbot/message` requests arrive concurrently for the same caller identity, neither of which has an active conversation
- **THEN** the database SHALL end up with exactly one new `chatbot_chat_conversation` row for that identity (the second request reuses the row created by the first or serializes behind it via the transaction)

#### Scenario: Provider invocation runs outside the transaction

- **WHEN** the streaming handler invokes `LLMProvider.streamCompletion` for a turn
- **THEN** the surrounding Prisma interactive transaction SHALL have already committed (covering lazy-create + user message + empty assistant message), so the streaming portion does not hold a long-lived transaction

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
- `sameSite` SHALL be `lax`
- `secure` SHALL be `true` when `NODE_ENV=production`, and `false` otherwise (to permit local development over HTTP)
- the value SHALL be signed using `COOKIE_SECRET` via `@fastify/cookie`'s signing API
- the cookie name SHALL be `chatbot_session_id`
- `path` SHALL be `/api/chatbot`
- `Max-Age` SHALL be 30 days, refreshed (sliding) on each request that the identity preHandler reads or writes the cookie

#### Scenario: Cookie set on first anonymous request

- **WHEN** an anonymous client posts a chat message without an existing `chatbot_session_id` cookie and `NODE_ENV` is `development`
- **THEN** the response SHALL include a `Set-Cookie` header for `chatbot_session_id` with attributes `HttpOnly`, `SameSite=Lax`, `Path=/api/chatbot`, `Max-Age=2592000`, and a signed value, and the header SHALL NOT include `Secure`

#### Scenario: Cookie marked Secure in production

- **WHEN** the cookie is set with `NODE_ENV=production`
- **THEN** the `Set-Cookie` header SHALL include the `Secure` attribute in addition to all other attributes above

#### Scenario: Tampered cookie rejected and replaced

- **WHEN** an anonymous client sends a chat message carrying a `chatbot_session_id` cookie whose signature does not validate against `COOKIE_SECRET`
- **THEN** the system SHALL treat the request as having no session identity, generate a fresh `session_id`, and set a new signed cookie in the response

#### Scenario: Sliding refresh on each interaction

- **WHEN** an anonymous client with a valid signed cookie sends a chat message after some elapsed time
- **THEN** the response SHALL include a `Set-Cookie` header that re-issues `chatbot_session_id` with the same value and a refreshed `Max-Age=2592000`

### Requirement: Identity preHandler resolves caller without 401-ing

A feature-local preHandler SHALL run on chatbot endpoints to resolve caller identity into `request.chatbotIdentity` as either `{ kind: "user", userId }` or `{ kind: "session", sessionId }`. The preHandler SHALL prefer `request.currentUser.id` when set (populated by the existing global authentication and user-resolve plugins), fall back to a valid signed `session_id` cookie, and otherwise — only on identity-creating endpoints (`POST /api/chatbot/message`) — generate a new `session_id` and set the cookie. The preHandler SHALL NOT respond with HTTP 401 when no auth is present, on any chatbot endpoint.

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
