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

### 14. Mandatory citation rule with middle-ground fallback (opener invariant + persistent disclaimer; quantitative content permitted with caveats)

**Decision**: System prompt includes the citation rule and a two-part guardrail for the no-source case:

- **Load-bearing opener literal**: every K=0 turn SHALL start with `"No dispongo de fuentes verificadas en mi corpus para responder esto con precisión."` — byte-for-byte. This is the structural caveat that frames everything that follows.
- **Soft guidance on quantitative claims**: the model MAY include factors, cifras, fechas, ranges, or contextual information after the opener, provided they are CALIFICADAS as approximate or referential (`"aproximadamente"`, `"típicamente"`, `"según fuentes públicas como X"`). The model SHALL NOT invent URLs or `§X.Y`-style section references in this path — those are reserved for citation-backed answers and their presence would forge traceability that doesn't exist.

The persistent foot-of-chat disclaimer (`"Huella usa IA y puede equivocarse. Verifica las respuestas con las fuentes citadas."`) is the second layer of protection — it reminds the user that anything the bot says, in any state, is AI-generated and not a substitute for verifying against an authoritative source.

**Rationale**: This design replaces an earlier, stricter version that prohibited any quantitative content in the K=0 path. The strict version was authored as a defensive over-correction by Claude during spec drafting and was not anchored to operator practice or an industrial precedent — both Claude and ChatGPT's vanilla products give caveat-qualified parametric answers in similar no-source scenarios, and the practical consequence of total silence on cifras is poor UX without a measured hallucination win. Two layers of protection (opener invariant + persistent disclaimer) are the right balance for an MVP in this domain:

- **Why the opener stays load-bearing**: it is a structural caveat that the model cannot quietly dilute. A regression that omits it is caught by test 10.4's substring assertion at byte-level. Without it, the model's response is indistinguishable from a corpus-backed answer in tone, which IS the failure mode the citation rule exists to prevent.
- **Why URL/citation invention stays prohibited**: the citation panel is the user's verification surface. If the model fabricates `[GHG Protocol §2.3](https://...)` in the body of a K=0 response, the user has no way to know the link wasn't sourced from the corpus. This is the only quantitative guardrail that survives — fabricating a number is recoverable (the user double-checks); fabricating a citation is reputational because it directly contradicts the panel's promise.
- **Why other quantitative content is permitted with caveats**: domain users (PMs, sustainability analysts) can interpret "aproximadamente 2.7 kg CO2/L según fuentes públicas como GHG Protocol" with the right amount of skepticism. The disclaimer, the opener, and their domain expertise stack to the right amount of friction.
- **Why the eval suite (deferred) closes the loop**: when goldens land in `chatbot-educate-mode-full`, the eval pipeline can measure the actual hallucination rate on K=0 responses and tighten the prompt empirically. Until then, the two-layer protection is intentionally light-touch, with the trigger to re-tighten being measured drift in the eval results.

**On the earlier rejected variant ("según mi entrenamiento" language)**: Nicolas first proposed phrasing where the bot says "de mi entrenamiento puedo decirte que X". That phrasing was discussed and is permitted under this decision — its risk profile is no different from any other caveat-qualified parametric content, and the opener already discloses the structural caveat. The model is not REQUIRED to use that exact phrase; it MAY when natural.

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

**Rationale**: Operator-supplied data may carry malformed `cite_url`; filtering at the boundary keeps the persisted shape valid. K=0 is the dangerous edge: dropping silently and letting the LLM proceed yields uncited parametric-knowledge answers — exactly the failure the citation rule prevents. Routing K=0 through the same fallback as N=0 means the worst answer is the middle-ground opener-plus-optional-redirect (per Decision 14), never an unsupported quantitative claim. Test 10.4's load-bearing assertions are: (a) the response STARTS with the K=0 opener literal byte-for-byte and (b) it contains no Markdown link `[label](url)` and no `§X.Y` section reference (i.e., no INVENTED citations or section numbers). Quantitative content (factors, percentages, dates) is INTENTIONALLY allowed in the K=0 path provided it is qualified per Decision 14 — the canary is "no invented traceability", not "no digits". An earlier draft of this rationale described the canary as "fails if any digit-bearing token appears near domain keywords"; that wording contradicted Decision 14 and was incorrect — the actual test assertions are the opener invariant and the no-invented-citations rule, both of which permit caveated numeric content. The eval suite (deferred to `chatbot-educate-mode-full`) is the right place to add quantitative-quality gating once goldens land.

### 20. `cite_url` points to canonical public source; Blob mirror deferred

**Decision**: First-ingested document's `cite_url` is the canonical public URL on `ghgprotocol.org`, passed via `--cite-url`. Even when V4 mirrors to Blob, `cite_url` continues to point to the canonical source.

**Rationale**: A citation's value is verifiability — the user reads the underlying claim in its original context. Canonical URL is what every external reader (auditor, regulator) recognizes; Blob is an internal artifact.

### 21. Azure OpenAI API key fallback for development; managed identity in production

**Decision**: Both Azure providers check `AZURE_OPENAI_API_KEY` at construction. If set, use API key. Otherwise `DefaultAzureCredential`. Production leaves the var unset.

**Rationale**: Managed identity needs `az login` + role assignment — heavy for local dev. Key-first fallback is the right default for dev without weakening prod safety.

**Intentional asymmetry with the mock-in-prod guard**: the embedding provider throws at boot when `IS_PROD && EMBEDDING_PROVIDER === "mock"` (Decision 6). There is **no parallel guard** for `IS_PROD && AZURE_OPENAI_API_KEY !== undefined`. The two cases are not symmetric:

- **Mock embedding in prod = silent corpus corruption**. The mock returns SHA-256-derived vectors with no semantic relation to the input text; cosine similarity over them is essentially random. The chatbot would happily cite chunks that have nothing to do with the user's question, with full citation panels and `"sources"` payloads — a _worse_ failure mode than no answer at all, because the broken behaviour is invisible to the user. This must fail fast and loud at boot.
- **API key in prod = security suboptimum, functionally correct**. The chat completes correctly; the only loss is the operational benefit of managed identity (no rotating secrets, central auth audit). A boot guard here would block legitimate operational scenarios — e.g., a brief migration window where managed identity is being rolled out per-deployment, or an incident-response situation where ad-hoc key auth is the fastest path back to service. The constraint is documented in `docs/operations/runbook.md` and enforced via deployment manifest, not via a hard runtime crash.

If a future change observes operators routinely leaking the key into production, that is the trigger to revisit and add the guard. Until that signal exists, the asymmetry is the right default.

### 22. Minimal system prompt v1 in `prompts/es/system.md`, ~10 lines

**Decision**: Short Spanish file at `apps/api/src/features/chatbot/prompts/es/system.md`. Identity, citation rule with explicit fallback wording, one-line `searchKnowledge` guidance. Read once at boot, cached.

**Rationale**: A larger prompt (domain vocabulary, mode detection) is `chatbot-educate-mode-full`'s contribution; locking it now risks rewriting after goldens measure what works.

### 23. `AZURE_OPENAI_API_VERSION` promoted to env var (default `"2024-10-21"`)

**Decision**: `AZURE_OPENAI_API_VERSION` becomes an env var (default `"2024-10-21"`). Optional `AZURE_OPENAI_EMBEDDING_API_VERSION` defaults to the chat value.

**Rationale**: API versions are per-resource configuration. Hardcoding means an admin needing to bump for one deployment edits code and redeploys.

### 24. Foundation fix: `tokens_used` on `chat_message` sums `inputTokens + outputTokens` from the terminal `usage` event

**Decision**: The streaming handler SHALL set `chat_message.tokens_used = inputTokens + outputTokens` from the terminal `usage` event, where `inputTokens` and `outputTokens` are the values extracted from the LLM provider's terminal `usage` event. Applied at the same finalization step that persists the assistant content and `sources_cited`.

**Rationale**: Foundation persisted only one of the two counts (output) on the assistant row, leaving `tokens_used` understated by ~the prompt size. Per-turn cost analytics and history-cap diagnostics both read this column; a one-sided value silently distorts both. The fix is mechanical and lands in the same handler change set as the new `sources` payload, so we take it here rather than schedule a separate change.

### 25. Two distinct affordances: trash icon (clear local state, no backend) + "Eliminar mi historial" link (D11 right-to-be-forgotten, calls backend)

**Decision**: The widget exposes TWO separate, visually distinct affordances:

1. **Trash icon** at the top of the widget panel: clears local React state only (resets message list, fresh `conversation_id`), NEVER calls a backend endpoint. Aria-label: `"Limpiar conversación"`.
2. **"Eliminar mi historial" link** in the foot of the widget panel: calls the foundation-defined `DELETE /api/chatbot/conversations/me` endpoint with a confirmation modal first. On HTTP 204, clears local state and shows a brief confirmation toast. This is the D11 right-to-be-forgotten affordance.

The foundation widget requirement "Widget invokes DELETE on user request" is thus FULFILLED by this change — just routed through a dedicated, clearly-labeled control instead of overloading the trash icon. The full UI contract (button styling, dialog copy, error handling, visibility rules) is specified in the `Widget invokes DELETE /api/chatbot/conversations/me via a dedicated "Eliminar mi historial" affordance` requirement in `chatbot-widget/spec.md`.

**Rationale for splitting the two affordances** (instead of overloading one button):

- **Trash icon = "clear current conversation from my view"** — non-destructive, instant, no auth interaction, no audit trail loss. Cheap action, cheap UI.
- **D11 link = "delete my data from the database"** — destructive, requires confirmation, has compliance weight. Different action, different UX cost.

Conflating them confused users: they either (a) expected "trash" to actually delete and panicked when it didn't, or (b) expected "trash" to be cosmetic and panicked when an early implementation actually deleted persisted rows. Two affordances with explicit, distinct labels remove the ambiguity.

**Why ship the D11 link in V1 instead of deferring**:

- Compliance under Ley 21.719 (Chile), LGPD (Brasil), GDPR-equivalent local laws requires the right to be **exercisable** by the data subject. Foundation already shipped the endpoint; not exposing it via UI puts the compliance burden on a manual support channel that doesn't yet exist (V1 has no operational support team — see Decision 27 on the Modo B redirect literal not mentioning support).
- The UX cost is minimal: one text-link button + one confirmation dialog. ~2 hours of frontend work + tests.
- A self-service deletion UI is also a **trust signal for UNDP and country deployments** — operators evaluating whether to deploy Huella Latam in their jurisdiction can point at the affordance as evidence of compliance posture, not just a backend promise.

**Why the foundation requirement was originally "REMOVED" and is now restored as MODIFIED**: an earlier version of this RAG MVP spec routed the trash icon to the DELETE endpoint, then realized that conflated two distinct user intents. The fix at that time was to clear-state-only the trash icon AND remove the foundation DELETE-on-click requirement. The miss was failing to add a separate D11 affordance — the "Eliminar mi historial" link — leaving compliance dependent on a non-existent support channel. This decision corrects that gap by keeping the trash icon clear-state-only AND adding the dedicated link, satisfying both the UX clarity goal and the compliance ask.

### 27. Bot identity stays forward-compatible across V1/V2/V3/V4/V5; V1 ships three-mode routing

**Decision**: The system prompt's identity literal is `"Eres el Asistente de Huella Latam, una plataforma para medir y reducir huella de carbono."` — stable across phases. The prompt also ships a three-mode routing block from V1: Modo A (Metodología → invokes `searchKnowledge`), Modo B (Plataforma → emits a roadmap-redirect literal that re-orients the user toward methodology questions, no tool invocation), Modo C (Conversacional → brief natural response with welcome/orientation when the user greets or asks for capabilities, no tool invocation). Only Modo A is "fully functional" in V1 — V3 will populate Modo B with a real platform-guide corpus + tool, and the redirect literal will be replaced by a tool-backed answer. The Modo B literal does NOT mention a support channel because Huella Latam does not yet have an operational support channel as of V1; the redirect re-routes the user toward what the bot CAN answer (methodology) rather than to a non-existent escalation path. The routing scaffolding ships in V1 to avoid two failure modes:

- **Failure mode 1 (without routing)**: every user message — including platform-usage and conversational — flows through `searchKnowledge`, which returns 0 chunks for non-methodology queries, which routes through the K=0 opener `"No dispongo de fuentes verificadas en mi corpus..."`. The user receives a misleading answer that implies their question SHOULD have an answer in the corpus when in fact V1 never planned to cover platform usage. UX is broken.
- **Failure mode 2 (single-mode V1, multi-mode V2/V3)**: if V1 ships with single-mode "asistente educativo" identity and prompt structure, V2/V3 require a system-prompt rewrite that breaks the V1 golden-question baseline once the eval suite lands. Identity drift mid-product is the wrong direction.

**Rationale**: The vision document presented to the Huella Latam team (the public HTML plan) frames the bot as "Asistente conversacional sobre huella de carbono y uso de la plataforma" with three explicit objectives (educar, ayudar a medir, guiar uso). V1 delivers only the first objective, but the assistant identity, routing, and capability disclosure must reflect the full vision so the user's mental model is stable across releases. The cost of shipping the three-mode block in V1 is ~10 extra prompt lines + 2 integration tests (10.35, 10.36). The cost of NOT shipping it is a confused user on every platform-usage question and a system-prompt rewrite when V3 lands.

**Architectural note for V3+ (no V1 spec change)**: V3 will ingest platform-usage docs as additional corpus sources. The current `chatbot_corpus_source` schema distinguishes by `source_type` (PDF/MD/URL/XLSX) and `scope` (GLOBAL/NATIONAL) but does NOT carry a `corpus_kind` discriminator (METHODOLOGY vs. PLATFORM_GUIDE vs. REGULATION). For V3, the implementer will need to choose between: (a) adding a nullable `corpus_kind` enum column, (b) reusing a `name` prefix convention (`methodology:GHG-Protocol` vs. `platform:Huella-Manual`), or (c) routing by `source_type` (PDF=methodology, MD=platform-guide). Option (a) is cleanest for retrieval filtering; (b) avoids a migration but is fragile; (c) couples taxonomy to file format and breaks if a future platform manual is published as PDF. **No decision is forced now** — V3 makes this call when the platform-guide corpus is real. This change leaves the schema unconstrained on this axis.

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
