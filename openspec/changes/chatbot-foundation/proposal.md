## Why

Phase 0 of the Huella Latam chatbot. Goal: a vertical slice end-to-end — a user opens a widget, sends a message, the API streams a mock response back via SSE, and the conversation persists with token and latency metrics. This change locks the contract for the `LLMProvider` abstraction, the persistence schema, the SSE plumbing, and the anonymous-or-authenticated identity model so that subsequent chatbot phases (RAG ingestion, real LLM, tools, datos privados) plug in additively.

## What Changes

- Add five chatbot tables in the existing `public` schema with a `chatbot_*` prefix: `chatbot_chat_conversation`, `chatbot_chat_message`, `chatbot_corpus_source`, `chatbot_corpus_chunk`, `chatbot_corpus_ingest_run`. The three corpus tables ship dormant — no read/write paths in this change.
- Add `ChatMessageRole` enum (`USER` | `ASSISTANT` | `SYSTEM` | `TOOL`).
- Add `POST /api/chatbot/message` — streams an assistant response via Server-Sent Events, persists user and assistant messages with `tokens_used` and `latency_ms`, and accepts both anonymous and authenticated callers. Persists `truncated = true` when the client disconnects mid-stream.
- Add `DELETE /api/chatbot/conversations/me` — idempotently deletes all conversations bound to caller identity. Anonymous callers identified by signed `chatbot_session_id` cookie; authenticated callers by `user_id`.
- Add an `LLMProvider` interface with two implementations: `mock` (deterministic eco template) and `azureOpenAI` (managed-identity, written but not exercised in tests). Selection via `LLM_PROVIDER` env var; `mock` rejected at boot when `NODE_ENV=production`.
- Add token cap constants and `CHATBOT_CONVERSATION_TTL_DAYS` to `apps/api/src/config/constants.ts`. Token caps enforced in the streaming handler before the provider call.
- Add error factories `ExternalServiceError` (503) and `RequestTooLargeError` (413) under `apps/api/src/errors/`. Reusable beyond the chatbot.
- Add a feature-local preHandler under `apps/api/src/features/chatbot/` that resolves caller identity (`request.currentUser` if authenticated, otherwise the signed `chatbot_session_id` cookie) without 401-ing on missing auth.
- Add `<ChatbotWidget />` mounted at the web root (`apps/web/src/routes/__root.tsx`) so it is reachable from both the public landing and the authenticated app. Streams via raw `fetch` + `ReadableStream` (the existing `ky` client does not support SSE). Reconnects on transient failures with `Last-Event-ID`; falls back to non-streaming after two consecutive failed connection attempts when initiating a new turn. Mid-turn disconnects always result in `truncated = true` with no replay — the widget surfaces the truncation to the user and the next turn is a fresh request.
- Add SSE testing helper at a new directory `apps/api/test/helpers/sse.ts` using `app.listen({ port: 0 })` plus real `fetch` (Fastify's `app.inject` does not stream).

## Capabilities

### New Capabilities

- `chatbot-conversation-persistence`: Schema and identity-scoping rules for `chatbot_chat_conversation` and `chatbot_chat_message`. Defines how anonymous (column `session_id`, populated from the signed `chatbot_session_id` cookie) and authenticated (column `user_id`) callers map onto conversation rows, the 30-day `expires_at` semantics, and the index plan that pre-positions for future Postgres-backed rate limiting.
- `chatbot-corpus-schema`: Migration-level shape of `chatbot_corpus_source`, `chatbot_corpus_chunk`, `chatbot_corpus_ingest_run`. Dormant in this change — no readers, no writers, no `embedding` column. Establishes the migration baseline so the V1 ingestion change can land additively.
- `chatbot-message-streaming`: `POST /api/chatbot/message` SSE contract — request shape, response framing, identity resolution, token-cap enforcement, persistence on disconnect, error surface.
- `chatbot-conversation-deletion`: `DELETE /api/chatbot/conversations/me` — idempotent, scoped to caller identity, no 401 when unauthenticated.
- `chatbot-llm-provider`: `LLMProvider` interface, `mock` and `azureOpenAI` implementations, env-based selection, mock-in-prod rejection at boot, token cap constants location.
- `chatbot-widget`: `<ChatbotWidget />` minimum-viable React component. Streams via raw `fetch` + `ReadableStream`, reconnects with `Last-Event-ID`, two-strike fallback to non-streaming. Final visual treatment, copy, ARIA streaming announcements, mobile responsiveness, and discoverability are explicitly deferred to a separate design review.

### Modified Capabilities

None. No existing OpenSpec capability is touched — `openspec/specs/awards-page/` and `openspec/specs/get-organization-badges/` are unrelated to the chatbot domain.

## Impact

- **Database**: New migration adds five tables (all in `public` schema, prefixed `chatbot_*`) and one enum (`ChatMessageRole`). Indexes on `(session_id, created_at DESC)`, `(ip_hash, created_at DESC)`, `(expires_at)`, and `(user_id, expires_at)` pre-position for retention sweeps and future rate limiting. No schema changes to existing tables. No Postgres extensions enabled in this change.
- **API**: New feature folder `apps/api/src/features/chatbot/` with `sendMessage/`, `deleteMyConversation/`, `llmProvider/`, and `helpers/` sub-folders. New routes group at `apps/api/src/routes/api/chatbot/index.ts`. New errors at `apps/api/src/errors/{ExternalServiceError, RequestTooLargeError}.ts`. New external plugin `apps/api/src/plugins/external/cookie.ts` registering `@fastify/cookie`. Token caps and `CHATBOT_CONVERSATION_TTL_DAYS` added to `apps/api/src/config/constants.ts`. New env `LLM_PROVIDER` parsed in `apps/api/src/config/environment.ts` with the same whitelist + boot-time validation pattern used by `AUTH_PROVIDER`. New `COOKIE_SECRET` env consumed by the cookie plugin.
- **Types**: New domain at `packages/types/src/chatbot/` with sub-folders `sendMessage/` and `deleteMyConversation/` (Zod schemas + inferred types). Re-exported from the package barrel.
- **Frontend**: New components folder `apps/web/src/components/Chatbot/` containing `ChatbotWidget.tsx` and `useChatStream.ts`. Widget mounted in `apps/web/src/routes/__root.tsx` as a minimum-viable placement (subject to design review). No new web dependencies — reuses existing `react-markdown` for rendering markdown in messages.
- **Dependencies**: `@fastify/cookie` and `openai` (for the AzureOpenAI client) added to `apps/api/package.json`. The `openai` package is imported but never instantiated in tests — tests run with `LLM_PROVIDER=mock`.
- **Tests**: New helper directory `apps/api/test/helpers/` with `sse.ts`. Integration tests for both endpoints under `apps/api/test/features/chatbot/`. Unit tests for the LLMProvider selector (mock-in-prod rejection, default selection).
- **Docs**: New chatbot retention/persistence section in `docs/security/sensitive-data.md`. New `LLM_PROVIDER` and `COOKIE_SECRET` entries in `docs/development/environment-variables.md`. Note in `docs/operations/runbook.md` declaring the pg_cron purge job and the Bicep dependencies as a separate infra change.
- **Conventions**: Future chatbot-related OpenSpec changes use the `chatbot-` prefix in flat kebab-case (`chatbot-rag-ingest`, `chatbot-educate-mode`, etc.) — the `chatbot-` change-naming convention (see `design.md` §Background Context, D10). The prefix is naming-only because OpenSpec 1.3.1 does not recurse into nested change subdirectories.

## Deferred Debt

Explicitly out of scope; documented here so subsequent changes can pick them up:

- **Bicep + Azure OpenAI provisioning** — separate infra change. The `azureOpenAI` provider implementation ships compiled, but production deployments cannot select it until the Azure resource exists, and the boot guard rejects `mock` in production. Net effect: production deployments stay broken-by-design until the infra change lands.
- **`pg_cron` extension and the daily purge job** for `chatbot_chat_conversation.expires_at < NOW()`. Schema ships with `expires_at` set at creation, but no scheduled enforcement. Conversations accumulate until the infra change enables `azure.extensions = pg_cron` on the server parameter and schedules the job.
- **`pgvector` extension and the `embedding vector(1024)` column** on `chatbot_corpus_chunk`. Added cohesively in `chatbot-rag-ingest` (V1) alongside ingestion code and the HNSW index, in a single migration.
- **RAG ingestion pipeline, system prompt, citation enforcement, tools, hybrid search** — V1 and later (`chatbot-rag-ingest`, `chatbot-educate-mode`, `chatbot-measure-tools`).
- **Postgres-backed rate limiting** on `chatbot_chat_message`. Indexes pre-position for it; the `@fastify/rate-limit` custom store comes in V1.
- **Eval suite, golden questions, PDF fixtures** — V1+ (`pnpm test:eval` gate).
- **First-open disclaimer** (text and trigger behavior) — listed in the planning document under V1, intentionally absent from foundation. The widget ships without a disclaimer surface.
- **Widget visual design, mobile responsiveness, ARIA streaming announcements, discoverability strategy** — separate design review before V1 polish.
- **Front Door / App Service tuning for SSE** (backend timeout 240s, header pass-through, `X-Accel-Buffering: no`) — deploy-side concerns. Code-side response headers ship in this change.
- **Helmet plugin (CSP)** — already absent at repo level; chatbot does not regress.
- **Server-side SSE replay buffer for mid-turn disconnects.** Foundation models any disconnect as `truncated = true` and lets the user retry on the next turn. Revisit only on evidence of frequent mid-turn disconnects in production telemetry.
- **Privacy notice / consent UI** for V5 anonymous-to-authenticated data access — surfaces alongside the V5 private-data toggle (see `design.md` §Background Context, D12).
- **SSE compression in production**: gzip middleware on the API or upstream proxy SHALL NOT compress `text/event-stream` responses; doing so collapses incremental delivery into a single burst. The deploy runbook (separate infra change) owns this configuration check; foundation ships only the response headers (`Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`) and a smoke check post-deploy that asserts `Content-Encoding` is absent on the SSE response.
- **CORS for cross-site widget**: foundation assumes same-origin or same-site deployment for `apps/web` and `apps/api` so the `SameSite=Lax` `chatbot_session_id` cookie is carried natively on `credentials: "include"` requests. The existing `cors-plugin` reflects `ALLOWED_ORIGIN` with `credentials: true`, which is sufficient for the same-site case. If the production deployment ever splits to truly cross-site origins, the cookie's `SameSite` property and the CORS configuration both require revisiting. No code-side CORS change in this foundation.

### Follow-up cleanup (post-merge polish)

Surfaced during a final cohesion audit; deliberately left out of this change to keep its scope tight. None block the foundation slice from working end-to-end:

- **Decide and apply a consistent enum-naming convention** across the chatbot domain (`ChatMessageRole`, `CorpusSourceType`, etc. vs. their fully-prefixed `ChatbotChatMessageRole`, `ChatbotCorpusSourceType` variants). Repo currently mixes both styles; foundation kept short names but it is worth a follow-up to align with whatever convention the team picks.
- **Markdown rendering hardening** for assistant content. `react-markdown` defaults are reasonably safe (HTML disabled), but once a real LLM is wired up in V1, audit the renderer config (KaTeX `\href` etc.) and lock down dangerous nodes explicitly. Foundation uses the mock provider, so this is pre-V1 due-diligence.
