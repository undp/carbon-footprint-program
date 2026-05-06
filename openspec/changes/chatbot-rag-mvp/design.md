## Context

Foundation locked the chatbot's vertical slice end-to-end against a deterministic mock LLM. This change swaps the mock answer for a real, citation-bearing one over a single corpus document (GHG Protocol Corporate Standard) and pins the contracts that V2 (`chatbot-measure-tools`), V4 (`chatbot-corpus-admin-ui`), and V5 (`chatbot-private-data`) extend additively. Four guiding principles: (a) every factual claim about the corpus carries a citation or the bot says `"no tengo fuente confiable"` — non-negotiable in a domain with multiple legitimate methodologies (GHG Protocol, ISO 14064, DEFRA, IPCC); (b) corpus sources are append-only with `DRAFT`→`ACTIVE`→`OUTDATED`; (c) `chatbot_corpus_source.scope` (`GLOBAL`/`NATIONAL`) keeps the codebase country-agnostic; (d) one assistant message per user message, ≤2 LLM calls per turn (one tool round).

## Goals / Non-Goals

**Goals:** working RAG with inline citations + "Fuentes consultadas" panel; complete corpus ops (ingest, audit, activate) without code; lock contracts (`EmbeddingProvider`, `searchKnowledge`, `sources_cited` JSONB, extended `done` payload); make risky paths safe by construction (re-ingest fails loudly; activation atomic; mock cannot reach prod; no provider error leaks).

**Non-Goals:** Bicep / Azure OpenAI provisioning; wider corpus; hybrid search and re-ranking (V2); eval suite (`chatbot-educate-mode-full`); full system prompt with mode detection; rate limiting, first-open disclaimer, post-generation validator, multi-round tool calling; admin UI (V4); Blob migration (V4); widget visual polish.

## Decisions

### 1. Vector search over `pgvector` with cosine distance; hybrid search deferred

**Decision**: Add the `vector` extension to the existing PostgreSQL Flexible Server and run nearest-neighbor search via cosine distance over `chatbot_corpus_chunk.embedding`. No full-text component, no re-ranking.

**Rationale**: Cosine over ~300-500 dense embeddings at V1 is sufficient without a separate managed service; the `query → top-K` contract is identical regardless of backing store, so AI Search migration is one file.

### 2. Embedding model `text-embedding-3-large` with `dimensions=1024`

**Decision**: All chunk and query embeddings via Azure OpenAI's `text-embedding-3-large` with `dimensions=1024`. Hardcoded in the `azureOpenAI` provider; column sized accordingly.

**Rationale**: Native 3072 triples on-disk vector storage with negligible recall improvement; `text-embedding-3-small` underperforms on technical-domain similarity. Pinning the dimension at the API boundary lets Azure normalize the reduced vector internally.

### 3. Bump the Postgres image to `pgvector/pgvector:pg18` across all three places

**Decision**: Replace `postgres:18-alpine` with `pgvector/pgvector:pg18` in `docker-compose.yml`, `packages/database/docker-compose.yml`, `apps/api/test/setup/testcontainers.ts`.

**Rationale**: Migration runs `CREATE EXTENSION IF NOT EXISTS vector` first; alpine doesn't bundle `pgvector`, so it would fail in CI testcontainers and locally. Major version 18 preserves the existing `pg_dump`/restore workflow.

### 4. Declare the `embedding` column via Prisma `Unsupported("vector(1024)")?`; reads/writes go through raw SQL

**Decision**: `embedding Unsupported("vector(1024)")?` on `ChatbotCorpusChunk`. Nullable. All embedding I/O via `prisma.$queryRaw` / `prisma.$executeRaw`.

**Rationale**: Prisma doesn't natively support `pgvector`. The `Unsupported(...)` annotation prevents `migrate diff` from proposing to drop the column. The column is invisible to the typed client by design — embeddings are bulk data, not row-level fields.

### 5. HNSW index with `vector_cosine_ops` at pgvector defaults (`m=16, ef_construction=64`)

**Decision**: Single HNSW index on `chatbot_corpus_chunk.embedding` with `vector_cosine_ops`, `m=16`, `ef_construction=64`. Search-time `ef_search` not pinned (default 40).

**Rationale**: HNSW grows incrementally (IVFFlat needs the corpus before index creation, rejected). pgvector defaults are conservative; re-tuning needs real recall-vs-latency measurements and is `chatbot-educate-mode-full`'s job.

### 6. `EmbeddingProvider` abstraction parallel to `LLMProvider`; mock-in-prod boot guard

**Decision**: `EmbeddingProvider` interface at `apps/api/src/features/chatbot/embeddingProvider/` with one method `embed(texts, options)`. `mock` (deterministic SHA-256-seeded 1024-dim, no network) and `azureOpenAI` (`text-embedding-3-large`, `dimensions=1024`, managed identity + API key fallback). Selection via `EMBEDDING_PROVIDER`; `mock` rejected at boot when `NODE_ENV=production`.

**Rationale**: Same shape as foundation's chat provider — same selection mechanism, mock-in-prod guard, factory cache. Determinism per input lets retrieval tests assert ordering without flakiness.

### 7. One ESLint rule, two file targets

**Decision**: Existing `chatbot/no-network-imports-in-mock` gets a second file scope on `embeddingProvider/mock.ts`. Rule body unchanged.

**Rationale**: Identical logic for both mocks. A duplicate rule would double maintenance surface.

### 8. CLI scripts under `apps/api/scripts/chatbot/`

**Decision**: `apps/api/scripts/chatbot/{ingestCorpus,activateCorpusSource}.ts`, invoked via `pnpm --filter api chatbot:{ingest,activate}`. Tsx-executable, outside `apps/api/src/`.

**Rationale**: Mirrors `packages/database/scripts/` precedent — discoverable, kept out of the runtime bundle. V4 hands operation to admins via in-platform UI; the CLI continues as a developer affordance.

### 9. Chunking heuristic: ~600 tokens, ~80 overlap, header-aware splits where possible

**Decision**: Chunks target ~600 tokens with ~80-token overlap. Split prefers nearest header within ±150 tokens, else nearest sentence boundary. Token estimation via shared `estimateTokens(text)`.

**Rationale**: 600 tokens fits top-K=8 under `CHATBOT_MAX_RAG_CONTEXT_TOKENS=12000` while keeping enough context to interpret. Header-aware respects GHG Protocol's section numbering. Goldens-driven tuning is `chatbot-educate-mode-full`'s job.

### 10. PDF parsing default: `pdf-parse`; trigger to evaluate Document Intelligence

**Decision**: `pdf-parse`. Runbook documents the upgrade trigger: ≥3 broken-chunk samples in manual review → evaluate Azure Document Intelligence.

**Rationale**: Single-package dependency, runs locally, no per-page cost, fine for well-structured PDFs. Document Intelligence handles complex layouts but adds a managed service per deployment with per-page billing — pay only when measured signal demands it.

### 11. Re-ingest fail-fast on `(name, version, status=DRAFT)` collision

**Decision**: Ingest CLI always creates a new `DRAFT`. On collision with an existing `(name, version, status=DRAFT)`, exits non-zero with a Spanish error naming the offending source id. `(name, version, status=ACTIVE|OUTDATED)` does not block.

**Rationale**: Silently overwriting risks losing operator A's careful re-chunking to operator B's stale invocation; silently creating duplicate `DRAFT` rows pollutes the table with hidden orphans. Fail-fast with explicit cleanup is the safe default.

### 12. Activation atomicity via advisory lock; activate refuses non-DRAFT targets

**Decision**: Activate CLI runs in one Prisma interactive transaction. First statement: `SELECT pg_advisory_xact_lock(('x' || substr(md5($key), 1, 16))::bit(64)::bigint)` with `$key = 'chatbot-corpus:' || name || ':' || scope`. Under the lock: verify `status='DRAFT'` (refuse otherwise), flip prior `ACTIVE` → `OUTDATED` with `deactivated_at = NOW()`, set target → `ACTIVE` with `activated_at = NOW()`.

**Rationale (atomicity)**: Without serialization, two concurrent activates on the same `(name, scope)` race to two `ACTIVE` rows — violating the exactly-one-active invariant. Foundation already established the advisory-lock pattern; identity-scoped key keeps different sources from blocking each other.

**Rationale (lock signature)**: `hashtextextended($key, 0)` is the natural choice but is not portable across all Azure Postgres Flexible Server image variants (it depends on the `hashtextextended` symbol being exposed at the SQL surface, which varies by minor version and extension set). The md5-hash-cast-to-bigint form (`('x' || substr(md5($key), 1, 16))::bit(64)::bigint`) is plain SQL plus core hashing — works everywhere Postgres 13+ runs, including every Azure-managed variant we currently target or have evaluated. The collision probability for a 64-bit slice of md5 across the small population of `(name, scope)` keys is negligible. `hashtext($key)` (32-bit) is the simpler alternative; we adopt the 64-bit md5 form because the advisory-lock space is 64-bit and using the full width avoids any cross-key collision concern as the corpus grows.

**Rationale (refuse non-DRAFT)**: An `OUTDATED` row was deliberately deactivated; reviving it without re-ingest leaves stale chunks under an `ACTIVE` flag — exactly the failure the citation rule exists to prevent.

### 13. Local filesystem for source PDFs at V1; `corpus_source.blob_path` nullable until V4

**Decision**: Ingest CLI reads from a local path. `chatbot_corpus_source.blob_path` left NULL. User-facing `cite_url` points to the canonical public source.

**Rationale**: V4 brings a browser ingest flow that requires Blob upload (admin UI cannot read the deployment's filesystem). Adding Blob upload now writes code V4 will replace. `blob_path` already exists nullable from foundation, so V4's migration is purely backfill.

### 14. Mandatory citation rule with explicit "no tengo fuente confiable" fallback

**Decision**: System prompt includes the citation rule and the explicit fallback wording. Handler enforces persistence via `sources_cited` JSONB; widget surfaces them.

**Rationale**: Carbon-footprint methodology isn't standardized; multiple legitimate frameworks coexist with overlapping but not identical numbers. A hallucinated emission factor invalidates a downstream inventory worth real money. Forced citations turn hallucinations from invisible to surfaced (no panel = unsupported answer); the explicit Spanish fallback gives the user a recognizable signal.

### 15. Single-round server-side tool calling; widget never sees `tool_call` events

**Decision**: Handler invokes `streamCompletion` once. On `tool_call`, executes server-side, appends `role=TOOL`, re-invokes once. Second consecutive `tool_call` → `ExternalServiceError`. Wire stays `delta`/`done`/`error`.

**Rationale**: One tool, one corpus, simple educational queries don't need multi-round. Bounding rounds at one keeps latency, cost, and abuse surface predictable. Server-side `tool_call` preserves the foundation SSE contract verbatim.

### 16. `searchKnowledge` tool signature: `{ query: string }` only

**Decision**: Tool schema exposes `query: string` only. `topK` (8), `scope`, `sourceType` are server-side defaults.

**Rationale**: Exposing more parameters invites parameter-juggling failures (model picks aggressive `topK` and blows the budget; invents `scope` values). Minimal surface pins behavior to the handler.

### 17. Inline `[cite_label](cite_url)` markdown links plus collapsible "Fuentes consultadas" panel

**Decision**: Inline citations rendered by the existing `react-markdown` + `remark-gfm` stack. Below the bubble: collapsible "Fuentes consultadas (N)" panel via MUI `Collapse` when `sourcesCited.length > 0`. Each row: `cite_label` (anchor, `target="_blank" rel="noopener noreferrer"`) + ~200-char snippet.

**Rationale**: Inline citations carry information at the read point; the bottom panel is an index without scrolling. Reusing existing libs means no new plugins or attack surface.

### 18. Wire contract: extend `done` SSE payload with optional `sources`

**Decision**: `done` payload `{ inputTokens, outputTokens }` → `{ inputTokens, outputTokens, sources?: SourceCitation[] }`. Optional; omitted when no tool ran.

**Rationale**: Smallest deviation from foundation. A separate `event: sources` would need a new branch in the widget hook; a side-channel HTTP fetch adds round-trips. Optional-not-empty-array keeps the wire compact for non-RAG turns.

### 19. `sources_cited` JSONB Zod-validated; partial-filter persists; all-filtered routes through no-source fallback

**Decision**: Each entry validated against `SourceCitationSchema`. Three cases: (a) **K ≥ 1 of N ≥ 1**: persist K, log warn for the (N−K) dropped, emit `sources`; (b) **K = 0 of N ≥ 1**: inject empty-corpus tool-result message, re-invoke LLM under the no-source fallback rule, persist `sources_cited = []`, omit `sources`; (c) **N = 0**: same as (b).

**Rationale**: Operator-supplied data may carry malformed `cite_url`; filtering at the boundary keeps the persisted shape valid. K=0 is the dangerous edge: dropping silently and letting the LLM proceed yields uncited parametric-knowledge answers — exactly the failure the citation rule prevents. Routing K=0 through the same fallback as N=0 means the worst answer is `"no tengo fuente confiable"`, never an unsupported claim.

### 20. `cite_url` points to canonical public source; Blob mirror deferred

**Decision**: First-ingested document's `cite_url` is the canonical public URL on `ghgprotocol.org`, passed via `--cite-url`. Even when V4 mirrors to Blob, `cite_url` continues to point to the canonical source.

**Rationale**: A citation's value is verifiability — the user reads the underlying claim in its original context. Canonical URL is what every external reader (auditor, regulator) recognizes; Blob is an internal artifact.

### 21. Azure OpenAI API key fallback for development; managed identity in production

**Decision**: Both Azure providers check `AZURE_OPENAI_API_KEY` at construction. If set, use API key. Otherwise `DefaultAzureCredential`. Production leaves the var unset.

**Rationale**: Managed identity needs `az login` + role assignment — heavy for local dev. Key-first fallback is the right default for dev without weakening prod safety.

### 22. Minimal system prompt v1 in `prompts/es/system.md`, ~10 lines

**Decision**: Short Spanish file at `apps/api/src/features/chatbot/prompts/es/system.md`. Identity, citation rule with explicit fallback wording, one-line `searchKnowledge` guidance. Read once at boot, cached.

**Rationale**: A larger prompt (domain vocabulary, mode detection) is `chatbot-educate-mode-full`'s contribution; locking it now risks rewriting after goldens measure what works.

### 23. `AZURE_OPENAI_API_VERSION` promoted to env var (default `"2024-10-21"`)

**Decision**: `AZURE_OPENAI_API_VERSION` becomes an env var (default `"2024-10-21"`). Optional `AZURE_OPENAI_EMBEDDING_API_VERSION` defaults to the chat value.

**Rationale**: API versions are per-resource configuration. Hardcoding means an admin needing to bump for one deployment edits code and redeploys.

### 24. Foundation fix: `tokens_used` on `chat_message` sums `inputTokens + outputTokens` from the terminal `usage` event

**Decision**: The streaming handler SHALL set `chat_message.tokens_used = inputTokens + outputTokens` from the terminal `usage` event, where `inputTokens` and `outputTokens` are the values extracted from the LLM provider's terminal `usage` event. Applied at the same finalization step that persists the assistant content and `sources_cited`.

**Rationale**: Foundation persisted only one of the two counts (output) on the assistant row, leaving `tokens_used` understated by ~the prompt size. Per-turn cost analytics and history-cap diagnostics both read this column; a one-sided value silently distorts both. The fix is mechanical and lands in the same handler change set as the new `sources` payload, so we take it here rather than schedule a separate change.

### 25. Foundation fix: trash icon clears local React state only — never deletes the conversation

**Decision**: Clicking the trash icon in the widget SHALL only clear local React state (resetting the message list and generating a fresh `conversation_id` for the next message). It SHALL NOT call any backend `DELETE` endpoint, and no such endpoint is added by this change. Conversations remain persisted in the database for the foundation retention window.

**Rationale**: Two reasons: (a) the conversation history is auditable and the operator may need to inspect a flagged turn after the user has cleared their UI — irrevocable client-triggered deletion makes that impossible; (b) adding a `DELETE` route opens an ownership/authorization surface (anon vs. authenticated, owner-checks, admin-bypass) that is V4 admin-UI scope, not V1 widget scope. PM-owned decision; the trash button is presented as "limpiar conversación" (clear) — not "eliminar" (delete) — and the in-database row is unaffected. A future change can introduce a real delete affordance with an explicit per-deployment retention policy.

### 26. Test fixture path declared in spec; PDF binary commit deferred

**Decision**: Tests reference `apps/api/test/fixtures/chatbot/ghg-protocol-sample.pdf`. Spec declares the path and expected properties (~5 pages of GHG Protocol fair-use, parseable, ≥1 heading, ≥1 definition paragraph). Binary committed during implementation.

**Rationale**: OpenSpec describes contracts, not binary fixtures. Splitting keeps the change reviewable as a spec artifact and respects fair-use considerations operators evaluate at commit time.

## Risks / Trade-offs

- **Single corpus document at V1 limits real-world signal** → heuristics get genuine pressure-testing only on a multi-document corpus. Mitigation: `chatbot-educate-mode-full` adds the eval suite that drives refinement.
- **`pgvector` may need migration to AI Search at scale** → recall/latency may degrade beyond ~200k chunks. Mitigation: contract is identical regardless of backing store; trigger is recall <80% on goldens or p95 >500ms.
- **HNSW index build time non-trivial for large corpora** → first ingest of multi-document corpus may produce a long `CREATE INDEX`. Mitigation: V1 ingest is one document; runbook documents V2+ expectations.
- **`pdf-parse` quality varies on complex layouts** → multi-column, dense tables, scanned pages produce broken chunks. Mitigation: runbook documents the Document Intelligence upgrade trigger; V1 corpus does not exercise these failure modes.
- **Single-round tool calling may produce thin answers on multi-step queries** → a query needing multiple corpus regions gets only top-K-once. Mitigation: V1 corpus is one document, top-K=8 is generous in-document; multi-round is V2 if telemetry shows the limit binds.
- **Re-ingest fail-fast surfaces parallel operations as errors** → two operators ingesting concurrently see explicit failures. Mitigation: runbook documents the resolution recipe.
- **API key fallback creates an operational risk vector if leaked into production** → setting `AZURE_OPENAI_API_KEY` in prod silently bypasses managed identity. Mitigation: runbook says prod leaves it unset; deployment manifest enforces absence.
- **Postgres image bump may slow first CI run** → `pgvector/pgvector:pg18` is larger than alpine. Mitigation: cached afterwards; one-time CI cost.
- **`sources_cited` Zod validation drops malformed entries silently from the user's view** → user expecting a filtered citation has no way to know. Mitigation: operator sees the warn log; right trade-off vs. showing broken links.
- **Chunking heuristic intentionally one-shot for V1** → recall on tail terms (rare acronyms, codes) may be lower than achievable. Mitigation: goldens in `chatbot-educate-mode-full` drive refinement; hybrid search (V2) is the upper bound.
- **`cite_url` canonical strategy depends on external URL stability** → if `ghgprotocol.org` reorganizes, V1-era citations break externally. Mitigation: operator can re-run ingest with an updated `--cite-url`; old assistant messages retain the historical link (correct audit-friendly behavior).
- **Persisting `embedding_model` as deployment name triggers re-embed on deployment rotation** → e.g., `…prod-v1` → `…prod-v2` triggers the re-embed playbook even when the underlying model is unchanged. Mitigation: conservative default; operators manually skip when verified. Tracking deployment + underlying model separately rejected as schema complexity without measurable V1 benefit.
