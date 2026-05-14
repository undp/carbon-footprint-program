## Why

V1 minimum-viable RAG slice over a single corpus (GHG Protocol Corporate Standard). The bot answers methodological questions with citations linking to the source, end-to-end through foundation's streaming endpoint. This change lifts foundation's deferred `embedding` column and `pgvector` extension, adds the `EmbeddingProvider` abstraction (mirrors `LLMProvider`), the CLI ingest/activate pipeline, the `searchKnowledge` retrieval function, and single-round server-side tool calling. The wire contract expands additively: the terminal `done` SSE event payload gains an optional `sources` field — foundation widgets that ignore it keep working.

**Multi-phase context (Decision 27)**: the public Huella Latam vision frames the bot as having three objectives — Educar (V1), Ayudar a medir (V2), Guiar uso de plataforma (V3). This change delivers ONLY V1 (Educar), but ships forward-compatible identity (`"Asistente de Huella Latam"`, not "asistente educativo") and a three-mode routing scaffold in the system prompt from day one. Modo A (Metodología) invokes `searchKnowledge`; Modo B (Plataforma) emits a redirect-to-support literal without invoking the tool; Modo C (Conversacional) emits a brief natural response. V3 will replace Modo B's redirect literal with a tool-backed answer over a platform-guide corpus. Shipping the routing scaffold in V1 avoids: (a) misleading users with a "no tengo fuente" K=0 opener for platform-usage questions, and (b) rewriting the system prompt and breaking V1 goldens when V3 lands.

## What Changes

- Bump Postgres image to `pgvector/pgvector:pg18` in `docker-compose.yml`, `packages/database/docker-compose.yml`, and `apps/api/test/setup/testcontainers.ts`. Image ships `vector` extension preinstalled.
- Additive Prisma migration: `CREATE EXTENSION IF NOT EXISTS vector`, `embedding vector(1024)` on `chatbot_corpus_chunk`, HNSW index with `vector_cosine_ops`. Schema declares `Unsupported("vector(1024)")?`; I/O via `$queryRaw`/`$executeRaw`.
- Delete `apps/api/test/features/chatbot/lint/noReferencesToCorpusTables.test.ts` — corpus tables stop being dormant.
- New `EmbeddingProvider` interface: `mock` (deterministic SHA-256-seeded 1024-dim) and `azureOpenAI` (`text-embedding-3-large`, `dimensions=1024`, managed identity + API key fallback). Selected via `EMBEDDING_PROVIDER`; `mock` rejected at boot in production.
- Extend `LLMProvider`: `LlmMessage` accepts `role=TOOL` (`toolCallId`) and `ASSISTANT` (`toolCalls?`); `LlmStreamEvent` adds `tool_call`. Azure forwards `tools` + `tool_choice: "auto"`; mock emits deterministic tool-call on documented keywords.
- Azure chat provider: API key fallback (`AZURE_OPENAI_API_KEY` if set, else `DefaultAzureCredential`); promote `AZURE_OPENAI_API_VERSION` from hardcoded constant to env var (default `"2024-10-21"`).
- Server-side `searchKnowledge(query, options)` pure function: cosine distance, top-K=8 default, always filters `status = ACTIVE`, optional `scope`/`sourceType`. Returns `ChunkWithMetadata`.
- `searchKnowledge` LLM tool wrapper. Schema exposes `{ query: string }` only; result formatted as `role=TOOL` message with cite labels inline.
- `sendMessage/handler.ts`: prepend system prompt; on `tool_call`, execute tool server-side before `reply.hijack()`, append `role=TOOL`, re-invoke once. Second consecutive `tool_call` aborts with `ExternalServiceError`. Wire stays `delta`/`done`/`error`.
- Persist `sources_cited` JSONB (`{ source_id, chunk_id, cite_label, cite_url, snippet }`) after Zod validation; chunks with malformed `cite_url` filtered out.
- Extend `done` SSE payload: `{ inputTokens, outputTokens, sources? }`. Backward-compatible.
- CLI `apps/api/scripts/chatbot/ingestCorpus.ts` (`pnpm --filter api chatbot:ingest`): `pdf-parse` + ~600-token chunks (~80 overlap, header-aware) → batched embeddings → DRAFT source + N chunks + `chatbot_corpus_ingest_run` audit row.
- Re-ingest with same `(name, version, status=DRAFT)` fails fast in Spanish; other status values create a new DRAFT alongside.
- CLI `activateCorpusSource.ts` (`pnpm --filter api chatbot:activate`): single transaction, `pg_advisory_xact_lock` keyed on `'chatbot-corpus:' || name || ':' || scope`, flips prior ACTIVE→OUTDATED and target DRAFT→ACTIVE. Refuses non-DRAFT.
- Extend `chatbot/no-network-imports-in-mock` ESLint rule with a second file scope on `embeddingProvider/mock.ts` (one rule, two file targets).
- Widget: `ChatbotMessage` gains `sourcesCited?`; `useChatStream` parses `sources` from `done`; `MessageBubble` renders collapsible "Fuentes consultadas" panel.
- Foundation regression fix (streaming): the foundation `chatbot-message-streaming` spec already requires `tokens_used = inputTokens + outputTokens`, but the shipped foundation handler persisted only `outputTokens`. This change corrects the implementation to match foundation's own contract, adds a regression test on the non-tool path, AND extends the rule to the new two-round tool path (`tokens_used` SHALL be sourced from the SECOND, terminal `usage` event in tool turns — the only piece not covered by foundation).
- Foundation fix (widget): the widget's conversation-management affordance is rendered as a "Nueva conversación" button (`AddIcon`) in the header. It clears local React state only (resets the message list and generates a fresh `conversation_id`). It SHALL NOT call any backend `DELETE` endpoint and no such endpoint is added — conversations remain persisted in the database. PM-owned decision documented in `design.md` Decision 25.

## Capabilities

### New Capabilities

- `chatbot-corpus-embeddings`: `EmbeddingProvider` interface, mock + azureOpenAI implementations, env selection, mock-in-prod boot guard, API key fallback, batching by token budget.
- `chatbot-corpus-ingest`: ingest + activate CLI scripts, PDF parsing, chunking heuristic, audit rows, the `DRAFT`/`ACTIVE`/`OUTDATED` state machine, advisory-lock activation.
- `chatbot-corpus-retrieval`: `searchKnowledge` pure server-side function over `pgvector` cosine distance with `ACTIVE`-only filter and optional `scope`/`sourceType`.

### Modified Capabilities

- `chatbot-corpus-schema`: lifts dormancy on the three corpus tables; adds `embedding vector(1024)`, `vector` extension, HNSW index; removes the `noReferencesToCorpusTables` lint.
- `chatbot-llm-provider`: tool-calling extensions on the message/event union, Azure tool propagation, mock keyword-triggered tool-calls, API key fallback, ESLint scope extension, `AZURE_OPENAI_API_VERSION` promoted to env var.
- `chatbot-message-streaming`: system prompt prepended, single-round tool calling, `sources_cited` Zod-validated persistence, `done` payload extended with optional `sources`, RAG context counted toward `CHATBOT_MAX_RAG_CONTEXT_TOKENS`.
- `chatbot-widget`: `ChatbotMessage` carries citations; `useChatStream` parses them; `MessageBubble` renders the panel.

## Impact

- **Database**: Additive migration (vector ext, `embedding vector(1024)`, HNSW index). Postgres image bumped in three files.
- **API**: New folders `embeddingProvider/`, `searchKnowledge/`, `tools/searchKnowledge/`, `prompts/es/`. New CLI scripts under `apps/api/scripts/chatbot/`. Modified `sendMessage/handler.ts`, `llmProvider/{types,azureOpenAI,mock}.ts`. New env vars: `EMBEDDING_PROVIDER`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME`, `AZURE_OPENAI_EMBEDDING_API_VERSION` (optional), `AZURE_OPENAI_API_VERSION` (promoted). New scripts `chatbot:ingest`, `chatbot:activate`.
- **Types**: New `packages/types/src/chatbot/sourceCitation/` with `SourceCitationSchema` + inferred type. `SendMessageDoneEventSchema` extended with optional `sources`.
- **Frontend**: `ChatbotMessage` gains `sourcesCited?`; `useChatStream` parses it; `MessageBubble` adds collapsible MUI `Collapse` panel. No new web deps.
- **Dependencies**: `pdf-parse` added to `apps/api/package.json`. No new web deps.
- **Tests**: New integration suites under `searchKnowledge/`, `ingest/`, `activate/`, `toolRound/`, `embeddingProvider/`. Four CRITICAL tests gate prod (10.1–10.4 in tasks.md). Fixture path `apps/api/test/fixtures/chatbot/ghg-protocol-sample.pdf` declared; binary committed in implementation phase.
- **Docs**: `docs/operations/runbook.md` adds a "Chatbot corpus ingestion" subsection. `docs/development/environment-variables.md` adds new env vars.
- **Conventions**: CLI scripts under `apps/api/scripts/chatbot/` mirror `packages/database/scripts/`. `searchKnowledge/` is a routeless feature folder consumed by the tool wrapper.

## Deferred Debt

Explicitly out of scope; documented here so subsequent changes can pick them up:

- **Bicep + Azure OpenAI provisioning** — out of repo. Manual portal provisioning at implementation time; separate tutorial documents the flow.
- **`pg_cron` extension and the daily purge job** for `chatbot_chat_conversation.expires_at < NOW()` — deferred from foundation, still deferred.
- **Postgres-backed rate limiting** on `chatbot_chat_message` — deferred to `chatbot-educate-mode-full`. Foundation indexes pre-position for it.
- **Eval suite with golden questions and a `pnpm test:eval` gate** — deferred to `chatbot-educate-mode-full`. The four CRITICAL tests cover deterministic retrieval and the tool-round invariant, not response quality. **Explicit V1-decision rationale**: a meaningful eval suite requires (a) the actual operator-supplied PDF that gets ingested in production, and (b) ~10–15 golden questions written by a domain expert with the corpus open. This change does NOT have either input bound; pretending we can ship an eval gate without them produces a test that asserts noise. The follow-up change SHALL prerequisite the operator-supplied PDF + golden-question list as inputs before opening, and SHALL gate `pnpm test:eval` on a per-deployment basis (national normatives need their own goldens; what passes for Chile may not pass for Argentina under the country-agnosticism principle). Until then, `chatbot-rag-mvp` ships explicitly without a quality gate, and the four CRITICAL tests guard only the structural invariants (recall on synthetic embeddings, single-round tool flow, K=0 fallback, atomic ingest).
- **First-open disclaimer in the widget** — deferred to `chatbot-educate-mode-full`.
- **"Eliminar mi historial" user-facing UI affordance + confirmation dialog + DELETE wiring from the widget** — deferred to `chatbot-educate-mode-full` (or another future change) per PM V1 scope decision. The backend endpoint `DELETE /api/chatbot/conversations/me` already exists from foundation's `chatbot-conversation-deletion` capability and is operable in V1 by support staff when a user submits a D11 right-to-be-forgotten request through support intake; the user-facing self-service UI is deferred. V1 is intentionally not a full-compliance-UI-complete release — the regulatory obligation under Ley 21.719 / LGPD / GDPR is met via support intake plus endpoint invocation in V1, with the self-service UI affordance planned for V2/V3 (see `design.md` Decision 25).
- **Widget load-history-on-init** — **LANDED in this change** (Decision 28). `GET /api/chatbot/conversations/me/current` exposes the persisted thread to the widget and `useChatStream` rehydrates `messages` on mount via the signed `chatbot_conversation_id` cookie. The endpoint enforces TTL (`expires_at > NOW()`) and a strict identity match (no IDOR window). PM scope decision moved this from `chatbot-educate-mode-full` into V1 to avoid the F5-loses-thread UX bug.

- **anon → auth conversation claim transition** — deferred to a future change covering private data (V5 in the documented vision). V1's `GET /api/chatbot/conversations/me/current` returns 404 when a request is authenticated AND its `chatbot_conversation_id` cookie points to an anonymous row (`user_id IS NULL`); the widget falls back to an empty thread and the user starts a fresh conversation. Implementing claim would require: (a) a server-side migration of an anon row's `session_id → user_id` upon authentication, (b) a UX decision on whether to claim implicitly (login → claim) or explicitly (login → "do you want to keep your anonymous thread?"), and (c) coordination with the V5 consent model. None of these are V1 scope. Documented in `design.md` Decision 28.
- **Hybrid search (vector plus full-text) and re-ranking** — V2.
- **System prompt v1 with full domain vocabulary and educar/medir/guiar mode detection** — deferred to `chatbot-educate-mode-full`. This change ships a minimal ~15-line prompt covering identity, the citation rule, the K=0 guardrail (load-bearing opener `"No dispongo de fuentes verificadas en mi corpus para responder esto con precisión."` plus the URL/citation-invention prohibition; quantitative content permitted with caveats per Decision 14), and a one-line guidance to call `searchKnowledge`.
- **Public-data tools (`getActiveMethodology`, `getEmissionFactors`, etc.)** — V2 (`chatbot-measure-tools`).
- **Admin UI for source management** — V4 (`chatbot-corpus-admin-ui`). CLI scripts are the V1 surface.
- **Multi-round tool calling** — single round suffices for MVP. A second consecutive tool-call request aborts with `EXTERNAL_SERVICE_ERROR`.
- **Post-generation citation validator** — V2.
- **Wider corpus** (IPCC, CDP, DEFRA, internal `.md` files, national normatives) — operational follow-up. Schema, ingest, retrieval support arbitrary expansion without code changes.
- **Wider PDF fixture set** for tests — only the ~5-page GHG fixture is in scope. Path declared in spec; binary commit and further fixtures arrive during implementation or in later changes.
- **Promotion of the chatbot identity preHandler to a global `tryAuth` decorator** — foundation deferred this; this change does not advance it.
- **Front Door / App Service tuning for SSE in production** — deploy-side concern. Foundation response headers ship and remain unchanged here.
- **Widget visual treatment, copy, ARIA streaming announcements, mobile responsiveness, and discoverability of the citations panel** — separate design review. Panel ships with minimum-viable styling reusing existing theme tokens.
- **Migration from local filesystem to Azure Blob Storage for source PDFs** — V4. `chatbot_corpus_source.blob_path` stays nullable until then; `cite_url` is the canonical link for V1.
- **Privacy notice and consent UI for V5 private-data tools** — V5 alongside the per-user consent toggle.
- **Cookie-secret rotation playbook** — deferred from foundation, still deferred.
