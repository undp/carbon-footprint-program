## ADDED Requirements

### Requirement: System exposes a searchKnowledge retrieval function

The system SHALL define `searchKnowledge(query: string, options?: { topK?: number; scope?: CorpusSourceScope; sourceType?: CorpusSourceType }) => Promise<ChunkWithMetadata[]>` at `apps/api/src/features/chatbot/searchKnowledge/searchKnowledge.ts`. It embeds the query via `getEmbeddingProvider().embed([query])`, then runs SQL against `chatbot_corpus_chunk` joined with `chatbot_corpus_source` ranked by cosine distance via the pgvector `<=>` operator, returning the top-`K` matches ordered most-similar first.

`ChunkWithMetadata`:

```ts
type ChunkWithMetadata = {
  source_id: bigint;
  chunk_id: bigint;
  cite_label: string | null;
  cite_url: string | null;
  page_number: number | null;
  section_title: string | null;
  content: string;
  similarity: number;
};
```

`similarity = 1 - cosine_distance` (`[-1, 1]`, 1 = exact). The function SHALL NOT pre-filter on `cite_label`/`cite_url` — validation happens in the streaming handler before persistence.

#### Scenario: Function signature matches the documented shape

- **WHEN** the TypeScript compiler type-checks `apps/api/src/features/chatbot/searchKnowledge/searchKnowledge.ts`
- **THEN** the exported `searchKnowledge` SHALL match the documented signature and the project SHALL type-check with `pnpm type-check`

#### Scenario: Query is embedded via the configured provider

- **WHEN** `searchKnowledge` is invoked with a non-empty query string
- **THEN** the implementation SHALL invoke `getEmbeddingProvider().embed([query])` exactly once and use the returned vector as the search vector

#### Scenario: Empty query is rejected with InvalidQueryError

- **WHEN** `searchKnowledge` is invoked with an empty or whitespace-only string (e.g., `""`, `"   "`, `"  \n  "`)
- **THEN** the function SHALL trim the input first and, if the trimmed result is empty, throw `InvalidQueryError` (defined at `apps/api/src/features/chatbot/searchKnowledge/errors.ts` with stable `name = "InvalidQueryError"`) and SHALL NOT invoke the embedding provider or execute SQL

#### Scenario: Oversized query is rejected with InvalidQueryError

- **WHEN** `searchKnowledge` is invoked with a query whose `estimateTokens(query.trim())` exceeds 512
- **THEN** the function SHALL throw `InvalidQueryError` whose message names the estimated token count and the cap, and SHALL NOT invoke the embedding provider or execute SQL. Rationale: defense in depth against an upstream caller that bypassed the handler-level user-input cap; also keeps the embedding provider's per-input 8192 bound unreachable from this path.

#### Scenario: Results are ordered by descending similarity

- **WHEN** `searchKnowledge` returns N results
- **THEN** the array SHALL be ordered with `result[i].similarity >= result[i+1].similarity` for all `0 ≤ i < N-1`

#### Scenario: Embedding provider failures propagate to the caller

- **WHEN** `getEmbeddingProvider().embed([query])` rejects (e.g., network error, HTTP 429, HTTP 5xx, invalid API key, quota exhaustion as defined in `chatbot-corpus-embeddings`)
- **THEN** `searchKnowledge` SHALL propagate the rejection as-is — without wrapping, without translating to `InvalidQueryError`, without catching-and-logging — and SHALL NOT execute the SQL query. The streaming handler is responsible for mapping the propagated error to its terminal SSE `error` event with `code = "EXTERNAL_SERVICE_ERROR"` (per `chatbot-message-streaming`); `searchKnowledge` itself stays transport-agnostic

### Requirement: Retrieval always filters on chatbot_corpus_source.status = 'ACTIVE'

The `searchKnowledge` SQL SHALL join `chatbot_corpus_chunk` with `chatbot_corpus_source` and SHALL include `chatbot_corpus_source.status = 'ACTIVE'` unconditionally. Chunks under `DRAFT` or `OUTDATED` sources SHALL NEVER appear in results, regardless of similarity.

**CRITICAL release-gate invariant** — failure of the OUTDATED-exclusion scenario blocks merging to production per `tasks.md` test 10.1.

#### Scenario: OUTDATED chunks are excluded from results

- **WHEN** the database contains chunks under a `DRAFT`, an `ACTIVE`, and an `OUTDATED` source — all with embeddings
- **AND** `searchKnowledge` is invoked with a query whose embedding is closest to a chunk under the `OUTDATED` source
- **THEN** the result SHALL contain only chunks from the `ACTIVE` source; the `OUTDATED` chunk SHALL NOT appear regardless of similarity

#### Scenario: DRAFT chunks are excluded from results

- **WHEN** the database contains chunks under a `DRAFT` and an `ACTIVE` source
- **AND** `searchKnowledge` is invoked with a query whose embedding is closest to a chunk under the `DRAFT` source
- **THEN** the result SHALL contain only chunks from the `ACTIVE` source; the `DRAFT` chunk SHALL NOT appear

#### Scenario: Activate-then-search makes the new chunks visible

- **WHEN** the activate CLI flips a previously-DRAFT source to `ACTIVE`
- **AND** `searchKnowledge` is invoked with a query closest to a chunk under that source
- **THEN** chunks from the newly-`ACTIVE` source SHALL appear in the result

### Requirement: Retrieval applies optional scope and sourceType filters when supplied

When `options.scope` is supplied, the SQL SHALL include `chatbot_corpus_source.scope = $scope`. When `options.sourceType` is supplied, the SQL SHALL include `chatbot_corpus_source.source_type = $sourceType`. Neither supplied means no filter (all `ACTIVE`). Both filters SHALL AND when both are supplied.

#### Scenario: Scope filter restricts results

- **WHEN** the database contains an `ACTIVE` `GLOBAL` and an `ACTIVE` `NATIONAL` source — both with chunks similar to the query
- **AND** `searchKnowledge` is invoked with `options = { scope: 'NATIONAL' }`
- **THEN** the result SHALL contain only chunks from the `NATIONAL` source

#### Scenario: SourceType filter restricts results

- **WHEN** the database contains an `ACTIVE` `PDF` and an `ACTIVE` `MD` source — both with chunks similar to the query
- **AND** `searchKnowledge` is invoked with `options = { sourceType: 'PDF' }`
- **THEN** the result SHALL contain only chunks from the `PDF` source

#### Scenario: No filters returns chunks across all ACTIVE sources

- **WHEN** the database contains multiple `ACTIVE` sources of different `scope` and `source_type`
- **AND** `searchKnowledge` is invoked with `options = {}` or omitted
- **THEN** the result SHALL include chunks from any of those sources, ranked by similarity

### Requirement: Retrieval defaults to top-K = 8 and respects custom topK

The SQL SHALL include `LIMIT $topK`. Default 8 when omitted. `topK` SHALL be an **integer in the inclusive range `[1, 20]`**; non-integer values (e.g., `3.5`), negative values, and out-of-range values SHALL throw `InvalidQueryError` and SHALL NOT execute SQL. Upper bound calibrated against `CHATBOT_MAX_RAG_CONTEXT_TOKENS = 12000` (~600-token chunks × 20 ≈ budget).

#### Scenario: Default top-K is 8

- **WHEN** the database contains 100 ACTIVE chunks all with non-NULL embeddings
- **AND** `searchKnowledge` is invoked with `options = {}` or omitted
- **THEN** the returned array SHALL contain at most 8 entries

#### Scenario: Custom top-K is honored

- **WHEN** `searchKnowledge` is invoked with `options = { topK: 12 }` against ≥12 ACTIVE chunks
- **THEN** the returned array SHALL contain exactly 12 entries

#### Scenario: Out-of-range top-K is rejected with InvalidQueryError

- **WHEN** `searchKnowledge` is invoked with `options = { topK: 0 }`, `options = { topK: 21 }`, or `options = { topK: -1 }`
- **THEN** the function SHALL throw `InvalidQueryError` (with `error.name === "InvalidQueryError"`) and SHALL NOT execute SQL

#### Scenario: Non-integer top-K is rejected with InvalidQueryError

- **WHEN** `searchKnowledge` is invoked with `options = { topK: 3.5 }` or any non-integer numeric value
- **THEN** the function SHALL throw `InvalidQueryError` whose message indicates `topK` must be an integer, and SHALL NOT execute SQL — the implementation SHALL use `Number.isInteger(topK)` (not coercion or `Math.floor`) so the contract stays explicit and silent rounding is impossible

### Requirement: Retrieval returns an empty array when the corpus has no ACTIVE chunks

The function SHALL return `[]` (not throw) when no `ACTIVE` chunks match the supplied filters. The streaming handler routes this through the no-source fallback.

#### Scenario: Empty ACTIVE corpus returns empty array

- **WHEN** `searchKnowledge` is invoked against a database where no `chatbot_corpus_source` row has `status = 'ACTIVE'`
- **THEN** the function SHALL return `[]`

#### Scenario: Filters that match no chunks return empty array

- **WHEN** `searchKnowledge` is invoked with `options = { scope: 'NATIONAL' }` against a database whose only `ACTIVE` source has `scope = 'GLOBAL'`
- **THEN** the function SHALL return `[]`

### Requirement: Retrieval uses raw SQL via Prisma for the vector query

SQL runs via `prisma.$queryRaw`. Parameter binding is used for `query` vector, `scope`, `sourceType`, `topK` (no string concatenation). The `SELECT` clause SHALL only include columns needed for `ChunkWithMetadata`; `embedding` SHALL NOT be selected back.

#### Scenario: Embedding column is not selected by the retrieval query

- **WHEN** the SQL executed by `searchKnowledge` is inspected
- **THEN** the `SELECT` clause SHALL NOT reference `embedding` and SHALL only select columns needed for `ChunkWithMetadata`

#### Scenario: All user-influenced parameters are bound, not concatenated

- **WHEN** the implementation of `searchKnowledge` is inspected
- **THEN** `query` vector, `scope`, `sourceType`, `topK` SHALL be passed as bound parameters (or equivalent) — never string-concatenated

### Requirement: Retrieval is consumed by the searchKnowledge LLM tool wrapper but ships independently

The function SHALL be self-contained — only Prisma plus the embedding provider, no Fastify, no SSE, no LLM dependencies. The LLM tool wrapper imports and calls it. Testable in isolation against an integration database.

#### Scenario: Function is importable without Fastify

- **WHEN** a unit test imports `searchKnowledge` and invokes it against an integration-test Prisma client
- **THEN** the test SHALL execute without instantiating Fastify or any chatbot streaming infrastructure
