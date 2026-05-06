## ADDED Requirements

### Requirement: Ingest CLI is the V1 surface for adding corpus sources

The system SHALL provide `apps/api/scripts/chatbot/ingestCorpus.ts`, registered in `apps/api/package.json` as `"chatbot:ingest"`, invoked as `pnpm --filter api chatbot:ingest <pdf-path> --label <label> --version <version> --source-type <type> --scope <scope> --cite-url <url> [--triggered-by <id>]`. Output SHALL be Spanish; success exits 0, failure exits non-zero with a Spanish error.

Argument validation:

- `<pdf-path>` — positional; readable file ending in `.pdf`
- `--label <label>` — non-empty string; SHALL NOT contain the `:` character (rejected at CLI argument parsing with a Spanish error). Written to `chatbot_corpus_source.cite_label`. Rationale: the activate CLI's advisory-lock key (see "Activate CLI flips state atomically under an identity-scoped advisory lock") is built as `'chatbot-corpus:' || name || ':' || scope`; permitting `:` inside `name` would let two distinct `(name, scope)` tuples hash to the same lock key (e.g., `("Foo:Bar", "GLOBAL")` vs `("Foo", "Bar:GLOBAL")` both yield `'chatbot-corpus:Foo:Bar:GLOBAL'`), causing unrelated activations to needlessly serialize on the same lock
- `--version <version>` — non-empty string; written to `chatbot_corpus_source.version`
- `--source-type <type>` — only `PDF` accepted in V1
- `--scope <scope>` — `GLOBAL` or `NATIONAL`
- `--cite-url <url>` — parseable HTTPS URL
- `--triggered-by <id>` — optional; defaults to `"cli:<os-user>"`

`--name <name>` is an optional alias for `--label`. The `name` column SHALL equal the value used for `cite_label` (V1 simplification; V4 may decouple).

#### Scenario: CLI script registered in package.json

- **WHEN** `apps/api/package.json` is inspected
- **THEN** the `scripts` section SHALL include exactly `"chatbot:ingest": "tsx scripts/chatbot/ingestCorpus.ts"` and `"chatbot:activate": "tsx scripts/chatbot/activateCorpusSource.ts"`

#### Scenario: Successful invocation prints source id and chunk count

- **WHEN** `pnpm --filter api chatbot:ingest path/to/ghg.pdf --label "GHG Protocol Corporate Standard" --version "v05" --source-type PDF --scope GLOBAL --cite-url "https://ghgprotocol.org/corporate-standard"` runs against a valid PDF
- **THEN** the script SHALL exit 0 and print to stdout the `source_id`, the chunk count, and the resolved embedding model identifier — all in Spanish

#### Scenario: Missing required argument fails fast

- **WHEN** the script is invoked without `--cite-url`
- **THEN** the script SHALL exit non-zero and SHALL print to stderr a Spanish error naming `--cite-url` as missing, before any database write

#### Scenario: Invalid source-type rejected at CLI layer

- **WHEN** the script is invoked with `--source-type XLSX`
- **THEN** the script SHALL exit non-zero with a Spanish error indicating only `PDF` is supported in V1

#### Scenario: Invalid cite-url rejected at CLI layer

- **WHEN** the script is invoked with `--cite-url "not-a-url"`
- **THEN** the script SHALL exit non-zero with a Spanish error indicating `--cite-url` must be a parseable HTTPS URL, before any database write

#### Scenario: Label containing colon character is rejected at CLI layer

- **WHEN** the script is invoked with `--label "Foo:Bar"` (or any label string containing `:`)
- **THEN** the script SHALL exit non-zero with a Spanish error indicating `--label` SHALL NOT contain `:`, before any database write or embedding-provider call. This prevents the advisory-lock-key collision documented on the `--label` argument-validation rule

### Requirement: Ingest CLI parses PDFs with pdf-parse and chunks with the documented heuristic

The CLI SHALL parse PDFs via `pdf-parse`, then split into chunks targeting ~600 tokens with ~80-token overlap (token counts via `estimateTokens`). When section markers (`^\d+(\.\d+)*\s+[A-Z]`) are present, the chunker SHALL prefer the nearest such marker within ±150 tokens of the target boundary; otherwise it splits at the nearest sentence boundary. Each chunk persists with a 0-indexed monotonically-increasing `chunk_index`.

#### Scenario: Chunk sizes within target range under normal text

- **WHEN** the CLI runs against a representative PDF whose text yields N chunks
- **THEN** at least 80% of resulting chunks SHALL have a token count in [400, 800] inclusive, measured via `estimateTokens`

#### Scenario: chunk_index is contiguous and zero-indexed

- **WHEN** the CLI inserts N chunks for a source
- **THEN** `chunk_index` values SHALL be exactly `0, 1, …, N-1`

#### Scenario: Section-heading-aware split where possible

- **WHEN** the source PDF contains markers matching the documented pattern, and a chunk boundary falls within ±150 tokens of one
- **THEN** the chunker SHALL split at that marker rather than at a mid-sentence boundary

### Requirement: Ingest CLI computes embeddings and inserts source plus chunks atomically

After parsing and chunking, the CLI SHALL invoke `getEmbeddingProvider().embed(chunkContents)`, then open a single Prisma interactive transaction inserting one `chatbot_corpus_source` row with `status = 'DRAFT'` and N `chatbot_corpus_chunk` rows referencing it via `source_id`, each with non-NULL `embedding`, `content`, `chunk_index`, `page_number`, `section_title`, `tokens`. Embedding values SHALL be inserted via raw SQL. The transaction commits atomically — all rows persist or none. Embedding-generation failure before the transaction opens SHALL persist no source/chunk rows.

**CRITICAL release-gate invariant** — failure of the happy-path-with-valid-PDF scenario below blocks merging to production per `tasks.md` test 10.2. Future maintainers SHALL NOT relax atomicity behind a feature flag, partial-write recovery, or "best-effort" mode without a follow-up OpenSpec change.

#### Scenario: Source and chunks land atomically on success

- **WHEN** the CLI completes successfully against a valid PDF that yields N chunks
- **THEN** the database SHALL contain exactly one new `chatbot_corpus_source` row with `status = 'DRAFT'` and exactly N new `chatbot_corpus_chunk` rows linked to it, each with a non-NULL 1024-dimensional `embedding`

#### Scenario: Embedding failure leaves no orphan source row

- **WHEN** the embedding provider throws before the transaction opens
- **THEN** no new `chatbot_corpus_source` or `chatbot_corpus_chunk` rows SHALL exist for the attempted ingest

#### Scenario: Transaction failure rolls back source and chunks together

- **WHEN** the database insert of the second chunk row fails inside the ingest transaction
- **THEN** the partially inserted `chatbot_corpus_source` row and the first chunk SHALL roll back; the database SHALL contain neither

### Requirement: Ingest CLI writes an audit row to chatbot_corpus_ingest_run

The CLI SHALL insert one row into `chatbot_corpus_ingest_run` for every invocation. The audit row inserts before the embedding-and-source transaction with `started_at = NOW()`, `triggered_by` populated, `source_id = NULL`, `completed_at = NULL`. On success, the CLI updates it with `source_id = <new id>`, `completed_at = NOW()`, `chunks_created = N`, `embedding_model = <resolved model>`. On failure it remains in initial state — providing a visible trace of the failed attempt.

#### Scenario: Audit row persists on success with all fields populated

- **WHEN** the CLI completes successfully against a valid PDF
- **THEN** the corresponding `chatbot_corpus_ingest_run` row SHALL have non-NULL `source_id`, non-NULL `completed_at`, `chunks_created` equal to the inserted count, and `embedding_model` equal to `EmbeddingResult.model`

#### Scenario: Audit row persists on failure with NULL completed_at

- **WHEN** the CLI fails during embedding generation
- **THEN** the `chatbot_corpus_ingest_run` row SHALL exist with non-NULL `started_at`, populated `triggered_by`, `source_id = NULL`, `completed_at = NULL`, `chunks_created = NULL`, `embedding_model = NULL`

#### Scenario: Audit row triggered_by reflects CLI invoker

- **WHEN** the CLI runs without `--triggered-by`
- **THEN** `triggered_by` SHALL match `cli:<os-user>` where `<os-user>` is `process.env.USER ?? process.env.USERNAME ?? "unknown"` resolved at invocation

### Requirement: Re-ingest with same (name, version) creates a new DRAFT but fails on collision with an existing DRAFT

The CLI SHALL always insert in `DRAFT`. Before inserting, it queries for an existing `(name, version, status='DRAFT')`. On collision, exits non-zero, inserts no rows, and prints a Spanish error naming the colliding `id`. `(name, version, status=ACTIVE|OUTDATED)` does not block.

#### Scenario: Re-ingest with same name and same version on top of OUTDATED is allowed

- **WHEN** the CLI is invoked with `--label "GHG Protocol" --version "v05"` and a row exists with that `name`, `version`, `status = 'OUTDATED'`
- **THEN** the CLI SHALL succeed and create a new `DRAFT` row alongside the historical `OUTDATED`

#### Scenario: Re-ingest with same name and same version on top of ACTIVE is allowed

- **WHEN** the CLI is invoked with `--label "GHG Protocol" --version "v05"` and a row exists with that `name`, `version`, `status = 'ACTIVE'`
- **THEN** the CLI SHALL succeed and create a new `DRAFT`; the existing `ACTIVE` row SHALL remain untouched

#### Scenario: Re-ingest collision on existing DRAFT fails fast

- **WHEN** the CLI is invoked with `--label "GHG Protocol" --version "v05"` and a row exists with that `name`, `version`, `status = 'DRAFT'`
- **THEN** the CLI SHALL exit non-zero, insert no new rows, and print to stderr a Spanish error naming the colliding source's `id`

#### Scenario: Re-ingest with different version creates a new DRAFT alongside

- **WHEN** the CLI is invoked with `--label "GHG Protocol" --version "v06"` and a row exists with `name = 'GHG Protocol'`, `version = 'v05'`, `status = 'ACTIVE'`
- **THEN** the CLI SHALL succeed; the database SHALL contain the existing `v05` ACTIVE plus a new `v06` DRAFT

### Requirement: Activate CLI flips state atomically under an identity-scoped advisory lock

The system SHALL provide `apps/api/scripts/chatbot/activateCorpusSource.ts`, registered as `"chatbot:activate"`, invoked as `pnpm --filter api chatbot:activate <source-id>`. The script runs a single Prisma interactive transaction whose first statement is `SELECT pg_advisory_xact_lock(('x' || substr(md5($key), 1, 16))::bit(64)::bigint)` with `$key = 'chatbot-corpus:' || name || ':' || scope`. The md5-cast-to-bigint form is used (instead of `hashtextextended($key, 0)`) for portability across all Azure Postgres Flexible Server image variants targeted by this codebase — `hashtextextended` is not guaranteed to be exposed at the SQL surface across every minor version and extension set. `hashtext($key)` (32-bit) is an acceptable simpler alternative; the 64-bit md5 form is preferred because it matches the advisory-lock space width and avoids any cross-key collision concern. Under the held lock: (a) verify target exists with `status = 'DRAFT'`, (b) flip prior `ACTIVE` of the same `(name, scope)` (if any) to `OUTDATED` with `deactivated_at = NOW()`, (c) set target to `ACTIVE` with `activated_at = NOW()`. The transaction commits atomically; the lock releases on commit/rollback.

The script exits 0 on success, non-zero with a Spanish error when: target id does not exist; target has `status != 'DRAFT'`; database is unreachable.

#### Scenario: Activate flips DRAFT to ACTIVE and prior ACTIVE to OUTDATED

- **WHEN** the activate CLI runs against a `DRAFT` source whose `(name, scope)` already has an `ACTIVE` predecessor
- **THEN** after success, the predecessor SHALL have `status = 'OUTDATED'` with non-NULL `deactivated_at`, the target SHALL have `status = 'ACTIVE'` with non-NULL `activated_at`, and both updates SHALL share the same transaction commit timestamp

#### Scenario: Activate first-ever source promotes without OUTDATED transition

- **WHEN** the activate CLI runs against a `DRAFT` source whose `(name, scope)` has no prior `ACTIVE` row
- **THEN** the target SHALL transition to `ACTIVE` with non-NULL `activated_at`, and no other row SHALL be modified

#### Scenario: Activate refuses non-DRAFT target

- **WHEN** the activate CLI is invoked with a source id whose row has `status = 'ACTIVE'` or `status = 'OUTDATED'`
- **THEN** the CLI SHALL exit non-zero with a Spanish error naming the source's current status; no row SHALL be modified

#### Scenario: Activate refuses non-existent source id

- **WHEN** the activate CLI is invoked with a source id that does not exist in `chatbot_corpus_source`
- **THEN** the CLI SHALL exit non-zero with a Spanish error naming the missing id; no row SHALL be modified

#### Scenario: Concurrent activates on same (name, scope) serialize on the advisory lock

- **WHEN** two `chatbot:activate` invocations against two different `DRAFT` rows with the same `(name, scope)` run concurrently
- **THEN** the transactions SHALL serialize via the advisory lock; the database SHALL end up with exactly one `ACTIVE` row for that `(name, scope)`; the other activate's transaction SHALL observe the freshly-flipped predecessor and either succeed or fail with the non-DRAFT error if its target was the predecessor that just got flipped to `OUTDATED`

#### Scenario: Concurrent activates on different (name, scope) do not block each other

- **WHEN** two `chatbot:activate` invocations against `DRAFT` rows with different `(name, scope)` run concurrently
- **THEN** the transactions SHALL acquire distinct advisory locks and SHALL NOT block each other; both SHALL complete with overlapping wall-clock execution windows

### Requirement: Test fixture path documented for ingest integration tests

Integration tests SHALL reference `apps/api/test/fixtures/chatbot/ghg-protocol-sample.pdf` as the standard fixture: ~5 pages of GHG Protocol Corporate Standard fair-use, parseable by `pdf-parse`, ≥1 section heading and ≥1 paragraph of definition text. The PDF binary itself SHALL be committed during the implementation phase. Tests SHALL fail explicitly (Spanish skip message naming the missing fixture) when absent.

#### Scenario: Tests use the documented fixture path

- **WHEN** any integration test exercises the ingest CLI's happy path
- **THEN** the test SHALL pass `apps/api/test/fixtures/chatbot/ghg-protocol-sample.pdf` (relative to repo root) as the PDF argument

#### Scenario: Missing fixture produces a clear failure

- **WHEN** an integration test depending on the fixture runs and the file does not exist
- **THEN** the test SHALL fail or skip with a Spanish message stating the fixture is missing and pointing at the documented path
