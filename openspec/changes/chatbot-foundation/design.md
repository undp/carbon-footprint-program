## Context

Huella Latam is adding a chatbot. The full product roadmap (educate / measure / guide platform / admin de fuentes / datos privados / ISO ingest) is structured as a sequence of OpenSpec changes prefixed `chatbot-`, each focused on one capability slice. This change, `chatbot-foundation`, is phase 0: a vertical slice that exercises every layer of the eventual stack — frontend widget, SSE plumbing, persistence, identity model, LLM provider abstraction — using a deterministic mock LLM. The intent is that all subsequent phases (RAG ingestion, real LLM, tools, datos privados) plug in additively, against contracts locked here.

The repo has zero precedent for: streaming responses (SSE or otherwise), endpoints that identify anonymous callers across requests (the existing public endpoints under `config: { public: true }` — e.g., `getTransparencyDataRoute` and the catalog routes — are anonymous-and-stateless and do not carry a per-caller session identifier), Postgres extensions (only the `views` Prisma preview feature is enabled), server-side scheduled jobs, signed cookies, or LLM integrations. Every cross-cutting decision in this document is consequently a first-of-its-kind for Huella Latam.

## Background Context

This change references several decisions that originated in a separate planning document. The relevant decisions are summarized inline here so this design is self-contained for reviewers without access to the planning.

### D1 — One LLM call per turn with a partly-cacheable prompt

Each user turn invokes the LLM exactly once. The system prompt (identity, rules, vocabulary, format) is structured to be cacheable across conversations; only the dynamic portion (RAG context, history, user message) varies per turn.

### D3 — Per-country Azure OpenAI deployment

Each country deployment provisions its own Azure OpenAI resource, consumed through Managed Identity. This aligns with the existing one-deployment-per-country principle and country-level data sovereignty.

### D5 — Custom React widget embedded in apps/web

The chatbot UI ships as a custom `<ChatbotWidget />` React component under `apps/web/src/components/Chatbot/`, with its own SSE streaming hook. The widget is reachable from both the public landing page (anonymous visitors) and authenticated routes — anonymous availability is an explicit product requirement.

### D7 — Versioned corpus with ACTIVE/OUTDATED pattern

Source documents are versioned in the database using append-only semantics with status transitions (`DRAFT` → `ACTIVE` → `OUTDATED`), never destructive updates. This matches the repo's existing convention for versioned reference data.

### D9 — Spanish UI with i18n-ready architecture

All chatbot-facing strings are in Spanish for foundation. Prompt files, glossaries, and configuration are parameterized by language so the bot can switch locales without rewriting prompts. No user-facing string is hardcoded outside per-language files.

### D10 — OpenSpec changes use the `chatbot-` prefix

Every chatbot-related change is named with the `chatbot-` prefix in flat kebab-case (e.g., `chatbot-foundation`, `chatbot-rag-ingest`). This enables filtering and review of the full chatbot change stream without contaminating unrelated product work.

### D11 — 30-day conversation retention with right-to-be-forgotten

All chat conversations (anonymous and authenticated) expire 30 days after creation. A `DELETE /api/chatbot/conversations/me` endpoint lets callers delete their own history at will. IPs, when stored, are kept only as salted hashes — never raw.

### D12 — Explicit opt-in for private-data tools (deferred to V5)

When V5 introduces tools that read the authenticated user's own data, a per-user toggle (default OFF, revocable at will) gates access in addition to the JWT. Foundation does not implement these tools; the toggle and tools arrive together in V5.

## Goals / Non-Goals

**Goals:**

- End-to-end pipeline working with a mock LLM: widget → API → SSE → persistence.
- Lock the `LLMProvider` contract so that V1 can implement RAG-aware completion without revisiting the interface.
- Lock the conversation persistence shape (including the dormant V1+ columns: `organization_id`, `ip_hash`, `sources_cited`) so subsequent phases land additively.
- Establish the anonymous-or-authenticated identity model with signed cookies, scoped to one feature consumer.
- Establish the SSE testing harness (`app.listen` + real `fetch`) so V1 can write integration tests without re-litigating infra.

**Non-Goals:**

- Real Azure OpenAI calls, RAG retrieval, citations, system prompt design, tools — all V1+.
- pg_cron extension enablement and the daily purge job for `expires_at < NOW()` — separate infra change.
- pgvector extension and the `embedding vector(1024)` column — bundled with `chatbot-rag-ingest` (V1).
- Postgres-backed rate limiting — V1. Indexes pre-position for it.
- Widget visual design, copy, mobile responsiveness, ARIA streaming announcements, discoverability — separate design review before V1 polish. Foundation ships a minimum-viable surface.
- First-open disclaimer — V1 per the planning document. Foundation widget has no disclaimer surface.
- Front Door / App Service tuning for SSE — deploy concerns. Code-side response headers ship in this change.

## Decisions

### 1. Domain isolation via `chatbot_*` table prefix in the `public` schema

**Decision**: The five chatbot tables ship in `public` with `chatbot_` prefixed onto their snake_case table names via Prisma `@@map` (`chatbot_chat_conversation`, `chatbot_chat_message`, `chatbot_corpus_source`, `chatbot_corpus_chunk`, `chatbot_corpus_ingest_run`). Multi-schema is not enabled.

**Rationale**: Enabling Prisma `multiSchema` would require annotating every existing model in `packages/database/src/prisma/schema.prisma` (about 80 models, 1093 lines) with `@@schema("public")`, plus adding `previewFeatures = ["views", "multiSchema"]` and `schemas = ["public", "chatbot"]`. The cost of that surface change for a phase 0 feature is disproportionate to the isolation it buys. Logical isolation via prefix is unambiguous to readers and operators (`grep chatbot_` partitions the schema cleanly), and Prisma client autocomplete groups the models naturally because they all start with `chatbot`. Trigger to revisit: V5 (datos privados), where physical isolation aids backup separation, role-based grants, and per-schema retention policies — at that point we have a real operational reason and the migration cost is justified.

**Alternatives considered**:

- Full `multiSchema` with a dedicated `chatbot` schema — rejected for the migration cost above.
- No prefix — rejected because table-name collisions are a real risk (a future user-feedback or moderation feature could want `chat_message`); the prefix protects the namespace.

### 2. Conversation persistence with 30-day TTL via `expires_at`; pg_cron purge deferred

**Decision**: `chatbot_chat_conversation` carries `expires_at` set at row creation to `created_at + CHATBOT_CONVERSATION_TTL_DAYS` (30 days). The pg_cron job that enforces deletion when `expires_at < NOW()` is **not** part of this change — it is deferred to a future infra change that also enables the `pg_cron` extension via the Azure server parameter `azure.extensions`. Schema also includes nullable `organization_id` (V5 datos privados), nullable `ip_hash` (V1 rate limiting), and `sources_cited JSONB DEFAULT '[]'` on `chatbot_chat_message` (V1 RAG citations). All three are unwritten by code in this change.

**Rationale**: The 30-day retention policy (see §Background Context, D11) sets the per-row TTL. Setting `expires_at` at insertion time keeps the application stateless about TTLs and lets the future cron job be a single SQL statement. Including the V1+ columns now (nullable / default-empty) avoids an additive migration churn later and locks the persistence shape against the wider chatbot roadmap.

**Conversation lifecycle**: a `chatbot_chat_conversation` row is created **lazily** on the first `POST /api/chatbot/message` for a caller identity (`userId` or `sessionId`) that has no active conversation row, where "active" means `expires_at > NOW()`. `expires_at` is set at that creation moment to `created_at + CHATBOT_CONVERSATION_TTL_DAYS`. The signed `chatbot_session_id` cookie and the conversation row are created in sequence within that same first `POST /api/chatbot/message` request: the identity preHandler runs first and mints the cookie when no valid one is presented, then the handler runs and lazy-creates the conversation row when no active conversation exists for the resolved identity. Cookie minting is **scoped to `POST /api/chatbot/message`** — `DELETE /api/chatbot/conversations/me` no-ops on missing identity and never mints a cookie (see decision 6 below and the `chatbot-conversation-deletion` spec). After `expires_at` (and once the future pg_cron job purges the row), the next message under the same `sessionId` creates a fresh conversation row; the sliding cookie persists across that boundary, which is the bridge to the TTL-semantics note that follows.

**Note on TTL semantics**: the `chatbot_session_id` cookie max-age is **sliding 30 days** (refreshed on each interaction with the chatbot). `chatbot_chat_conversation.expires_at` is set **once at conversation creation and is not refreshed**. The two TTLs intentionally drift: a user who chats every week keeps the cookie alive forever, but their first conversation is purged 30 days after creation. Conversations age out of the user's view independently of the cookie. This is the correct model for personal-data retention: the cookie identifies the user across browser sessions; the conversation TTL bounds the data-retention window per record.

**Alternatives considered**:

- Application-side TTL enforcement on read — rejected because every read path would need `WHERE expires_at > NOW()` filtering. Hot-path overhead.
- Ship `expires_at` only when the cron job exists — rejected because the column is the policy artifact; without it, any retention enforcement (manual or automated) loses per-row truth.
- Ship the pg_cron extension and job in this change — rejected per scope. Requires Bicep changes (`azure.extensions = pg_cron` server parameter) and the testcontainers `postgres:18-alpine` image used in tests does not include pg_cron, breaking local migrations.

### 3. Corpus tables ship dormant — no `embedding` column, no readers, no writers

**Decision**: `chatbot_corpus_source`, `chatbot_corpus_chunk`, `chatbot_corpus_ingest_run` ship with their structural columns but without an `embedding` column on `chatbot_corpus_chunk`. No application code reads or writes these tables in this change. The `embedding vector(1024)` column, the `pgvector` extension, and the HNSW index land cohesively in `chatbot-rag-ingest` (V1) alongside the ingestion pipeline.

**Rationale**: The versioned-corpus model (see §Background Context, D7) requires append-only source/chunk/ingest-run rows for the future RAG corpus. Shipping the structural baseline now lets V1 focus on extension enablement, the embedding column, the vector index, and the ingestion pipeline as a single cohesive change — instead of re-litigating the source/chunk/ingest-run shape under V1 time pressure. The cost of the migration baseline is the same now or later; doing it now consolidates schema design while it is still under active discussion.

**Alternatives considered**:

- Include `embedding Unsupported("vector(1024)")` now — rejected because it requires `CREATE EXTENSION vector` in the migration, which violates the no-extensions scope and would fail on testcontainers' bare Postgres image.
- Use a placeholder column type (`Bytes`, `Decimal[]`) and `ALTER COLUMN ... TYPE vector` later — rejected because it adds a second migration for one logical change with no payoff.
- Defer the corpus tables entirely until V1 — rejected because then V1 carries the migration baseline conversation along with the extension and ingestion concerns; splitting them keeps each change focused.

### 4. `LLMProvider` abstraction with `mock` and `azureOpenAI` implementations, env-selected, mock-rejected in production

**Decision**: An `LLMProvider` interface exposes one method, `streamCompletion(messages, options)`, returning an async iterable that yields token chunks plus a final `usage` summary (`{ inputTokens, outputTokens }`). Two implementations ship: `mock` returns a deterministic eco template (`"Recibí: {user_message}. Esta es una respuesta de mock."`) chunked into multiple events with synthetic token counts via `Math.ceil(text.length / 4)`. `azureOpenAI` uses the `openai` npm package's `AzureOpenAI` client with managed-identity authentication (no API keys) and is fully implemented but never selected in tests. Provider selection happens at boot in `apps/api/src/config/environment.ts` from the `LLM_PROVIDER` environment variable, with the same whitelist + IIFE-throw pattern used by `AUTH_PROVIDER`. The boot validation refuses to start the API when `LLM_PROVIDER=mock` AND `NODE_ENV=production`. Token caps live in `apps/api/src/config/constants.ts`: `CHATBOT_MAX_USER_INPUT_TOKENS = 4000`, `CHATBOT_MAX_HISTORY_TOKENS = 8000`, `CHATBOT_MAX_RAG_CONTEXT_TOKENS = 12000`, `CHATBOT_MAX_OUTPUT_TOKENS = 1500`, `CHATBOT_MAX_TURNS_PER_CONVERSATION = 50`. Enforced in the streaming handler before the provider call; over-cap inputs return 413 (`REQUEST_TOO_LARGE`).

**Rationale**: The one-LLM-call-per-turn shape with a partly-cacheable prompt (see §Background Context, D1) determines the interface: a single `streamCompletion` accepting a structured `messages` array (`{ role, content }[]`) so both implementations consume the same shape and so future caching annotations can be added without breaking the contract. The per-country Azure OpenAI deployment model (see §Background Context, D3) is the production target; we ship the implementation now (compiled, never selected in tests) so V1 doesn't have to design the contract under time pressure and the mock-vs-real path differs only in one factory. The mock-in-prod boot guard prevents the most likely operational accident — forgetting to set `LLM_PROVIDER=azure-openai` in a country deployment — from leaking into user traffic.

**Alternatives considered**:

- No abstraction, only the Azure OpenAI client — rejected because tests and local dev need a deterministic stream without external calls.
- Per-request runtime selection (header-based) — rejected because it leaks operational concerns into the API contract and complicates production safety.
- Validate `LLM_PROVIDER` lazily on first call — rejected because boot-time validation surfaces misconfiguration in CI / health checks rather than in user traffic.
- Synthesize tokens from a fixed count — rejected because using `Math.ceil(text.length / 4)` exercises the persistence path with values that look like real ones and catches bugs that hardcoded zeros would mask.

### 5. Server-Sent Events for `POST /api/chatbot/message`; mid-turn disconnects produce `truncated = true` with no replay

**Decision**: The streaming endpoint sets `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`, `Connection: keep-alive`. It writes the assistant message row to `chatbot_chat_message` immediately (with empty content and `latency_ms = NULL`) so the row's `id` can flow into the SSE event stream as a stable handle. Token chunks stream as SSE `data: ...` events. On normal completion, the handler updates the row with the accumulated content, `tokens_used`, and `latency_ms`. On client disconnect mid-stream, a `reply.raw.on('close')` finalizer updates the row with `truncated = true` plus whatever content accumulated so far (best-effort). The server does **not** maintain a per-stream replay buffer. Reconnection with `Last-Event-ID` is treated as a fresh request — the prior assistant message stays `truncated`, the new request is a new turn with a new row. The client-supplied `Last-Event-ID` header is logged for observability but does not change server behavior in this change.

**Rationale**: SSE is one-way, natively supported by browsers, and does not require WebSocket infrastructure. The use case is one-way streaming, so SSE fits. Mid-turn disconnects are unrecoverable at the LLM API level (the upstream stream cannot be resumed), so any client-side "replay" would mean buffering tokens server-side per active stream — operational liability without telemetry to justify it. The `Last-Event-ID` plumbing on the client is nonetheless wired (cheap, future-compatible) so V1+ can add a buffer without a contract change. Trigger to revisit: production telemetry showing frequent mid-turn disconnects.

**Testing**: SSE cannot be exercised with `app.inject()` (Fastify's in-memory injector does not stream). A new helper at `apps/api/test/helpers/sse.ts` exposes `collectSseEvents(app, url, body, options?)` using `app.listen({ port: 0 })` plus real `fetch` with stream consumption. The new directory `test/helpers/` is semantically distinct from the existing `test/factories/` (data builders) and `test/setup/` (Vitest globals).

**Alternatives considered**:

- WebSockets — rejected because they require server-side connection state, complicate proxies (Front Door supports WS but the rest of the platform does not use them), and the use case is one-way.
- Long-polling chunks — rejected because the UX is worse and the implementation cost is similar to SSE.
- Server-side replay buffer in this change — rejected per the rationale above.

### 6. Anonymous-or-authenticated identity via a feature-local preHandler + signed `chatbot_session_id` cookie

**Decision**: A preHandler at `apps/api/src/features/chatbot/helpers/identity.ts` resolves caller identity for both endpoints. If `request.currentUser` is set (the existing `authenticationPlugin` and `userResolvePlugin` populate it for authenticated requests), use `currentUser.id`. Otherwise, read the signed `chatbot_session_id` cookie via `@fastify/cookie`. If neither is present and the route requires identity (only `POST /api/chatbot/message` does — `DELETE /api/chatbot/conversations/me` no-ops on missing identity), generate a UUID v4, set it as a signed cookie named `chatbot_session_id` with `httpOnly`, `sameSite=lax`, `secure` when `NODE_ENV=production`, `path: "/api/chatbot"`, and a 30-day sliding max-age. The preHandler attaches `request.chatbotIdentity` as a discriminated union — `{ kind: "user", userId } | { kind: "session", sessionId }` — consumed by both endpoint services. The `@fastify/cookie` plugin is registered at `apps/api/src/plugins/external/cookie.ts` with a `COOKIE_SECRET` env var (required in production, fallback dev literal locally). Tampering with the signed cookie invalidates the signature; the preHandler treats invalid signatures as "no session" and starts a new one.

**Cookie path scope**: Path scoped to `/api/chatbot` to reduce the cookie's blast radius (it is not sent to other API routes). Known trade-off: if future endpoints outside `/api/chatbot/*` need the chatbot's anonymous identity (telemetry, bot-specific health checks, etc.), the path SHALL be widened to a common prefix. Not a problem today because the widget only talks to `/api/chatbot/*`.

**Rationale**: The repo's existing `fastify.requireAuth` decorator is binary — 401 on unauthenticated requests against private routes. The chatbot is the first feature with a true anonymous-OR-authenticated path (anonymous landing widget plus authenticated app widget share the same endpoint). A feature-local preHandler keeps the new pattern contained to one consumer and gives a short path to promotion: when V4 (admin de fuentes) or V5 (datos privados) introduces a second consumer with comparable requirements, extract the preHandler to `apps/api/src/plugins/app/optionalAuthPlugin.ts` as a global `fastify.tryAuth` decorator. Promotion is a refactor with two real examples in hand, not a speculative design.

**Alternatives considered**:

- Global `fastify.tryAuth` decorator now — rejected because designing a global pattern with one consumer overfits to the chatbot's exact requirements. Promote when V4/V5 lands.
- Custom request header (`x-session-id`) instead of a cookie — rejected because the widget is a same-site browser client; cookies handle session persistence across page reloads natively, and a custom header forces the widget to manage its own storage with no security upside.
- Require auth on `POST /api/chatbot/message` — rejected because the custom widget on the public landing page (see §Background Context, D5) requires the widget to work for unauthenticated visitors.

### 7. Widget streams via raw `fetch` + `ReadableStream`, mounted at `__root.tsx`

**Decision**: `<ChatbotWidget />` lives at `apps/web/src/components/Chatbot/ChatbotWidget.tsx` with a co-located `useChatStream.ts` hook. The hook calls `POST /api/chatbot/message` directly with `fetch` (not the shared `apiClient` based on `ky`) because `ky` does not surface the response body as a `ReadableStream`. The hook reads the SSE stream incrementally, dispatches token deltas to the widget, and exposes the canonical states: empty, loading, streaming, error, truncated, degraded. The widget is mounted at `apps/web/src/routes/__root.tsx` so it is reachable from both the public landing route (`/`) and authenticated routes. **Reconnection model**: on the _initial_ `fetch` for a new turn, the hook retries once after a short backoff on transport-level failure. On a second consecutive failure when initiating that same new turn, the widget enters a **degraded state** that surfaces an explicit error to the user — the streaming path is disabled and no further requests are issued automatically. Foundation ships only the flag and the degraded-state UI; the actual non-streaming fallback request arrives in V1 when the corresponding endpoint exists. The intent of foundation here is plumbing for the flag, not a functional fallback. **Mid-turn disconnects** (transport drops after the stream began) **always result in `truncated = true` with no replay** — the hook ends the current turn, marks it truncated in local state, and waits for the user to start a new turn.

**Rationale**: The custom React widget under `apps/web` (see §Background Context, D5) is the chosen UI surface. The repo's HTTP client (`ky`) does not support SSE. Building the streaming path with `fetch` + `ReadableStream` is the smallest deviation from the repo's conventions and matches `ky`'s own recommendation for streaming use cases. Mounting at `__root.tsx` is a minimum-viable placement that satisfies the "anonymous + authenticated" requirement; the design review will decide whether to relocate. The two-strike fallback to non-streaming is a defensive UX for slow or filtered networks; it never confuses with mid-turn disconnects, which are a separate, distinctly-modeled state.

**Alternatives considered**:

- Browser `EventSource` API — rejected because `EventSource` is GET-only and cannot send a request body or custom headers, both of which the chatbot needs (the user message is the body).
- Add SSE support to the shared `apiClient` — rejected because `ky` does not expose `ReadableStream` and SSE conflicts with `ky`'s response parsing model. A separate streaming function is cleaner than forking the shared client.
- Mount the widget only inside `apps/web/src/routes/app.tsx` — rejected because it loses the anonymous landing case explicitly required by the custom-widget decision (see §Background Context, D5).

## Risks / Trade-offs

- **[`expires_at` not enforced until pg_cron lands]** → Conversations accumulate in production until a separate infra change enables the extension and schedules the daily purge job. Mitigation: the infra change is a hard prerequisite for V1 production traffic; the unenforced-retention window is bounded by the foundation-to-V1 gap. Manual `DELETE` is available as an ops escape valve.
- **[Mock provider is the only working provider in foundation]** → Production deployments cannot ship until the Bicep + Azure OpenAI infra change lands and `LLM_PROVIDER=azure-openai` is set. Mitigation: by design. The boot guard rejecting `mock` in production prevents accidental shipment.
- **[`COOKIE_SECRET` rotation invalidates anonymous sessions]** → Rotating the secret invalidates all signed `chatbot_session_id` cookies and thus all anonymous conversations in flight (their owner becomes unrecoverable). Mitigation: document the rotation playbook in the runbook (added in this change). For V1+ when traffic matters, consider a key list (current + previous) for graceful rotation.
- **[Mid-turn disconnects produce orphaned partial responses]** → User sees a truncated assistant message and must re-ask. Mitigation: explicit `truncated = true` flag per message lets the widget surface the state honestly. Server-side replay buffer remains deferred — revisit on production telemetry showing frequent mid-turn disconnects.
- **[Widget mount point may move]** → Anything that depends on the widget being globally mounted at `__root.tsx` will need an update if the design review relocates it. Mitigation: nothing depends on it today. The design review is scheduled before V1 polish.
- **[Indexes pre-position for rate limiting that hasn't been written]** → `(session_id, created_at DESC)` and `(ip_hash, created_at DESC)` are created speculatively for V1's Postgres-backed rate-limit store. If V1 picks a different rate-limit strategy, these indexes are dead weight. Mitigation: indexes are cheap on small tables; if V1 diverges, drop them in a focused migration.
- **[`openai` SDK adds a sizable dep without immediate exercise]** → The Azure OpenAI client is imported but never instantiated in tests. Mitigation: the import path is needed for `azureOpenAI.ts` to compile. Acknowledged dependency cost; revisit if SDK size becomes a deployment concern.
- **[SSE behind Front Door / App Service is unverified]** → Production proxy may buffer or terminate streams. Mitigation: deploy concerns deferred. Code-side response headers are correct (`X-Accel-Buffering: no`, `Cache-Control: no-cache, no-transform`); once infra lands, observation under real network conditions will inform tuning.
- **[gzip middleware on SSE may collapse incremental delivery]** → If, in production, the SSE response arrives in a single burst rather than streaming incrementally, suspect a gzip middleware misconfiguration. Diagnostic: `Content-Encoding: gzip` present on the SSE response when it should not be. Mitigation: documented as a check in the deploy runbook (separate change); add a smoke check post-deploy.
- **[CORS + `credentials: "include"` in production]** → The widget calls `POST /api/chatbot/message` and `DELETE /api/chatbot/conversations/me` with `credentials: "include"` so the `chatbot_session_id` cookie rides along. Production deployment is assumed same-origin or same-site such that the `SameSite=Lax` cookie is carried natively; the existing `cors-plugin` reflects `ALLOWED_ORIGIN` with `credentials: true`, which is sufficient for the same-site case. If production ever splits to truly cross-site origins, both the cookie's `SameSite` property and the CORS configuration would need revisiting; the cookie's `path=/api/chatbot` further reduces blast radius. Documented assumption-under-observation — no code-side CORS change in this foundation.
