## ADDED Requirements

### Requirement: Postgres image bundles the pgvector extension

The Postgres image in `docker-compose.yml`, `packages/database/docker-compose.yml`, and `apps/api/test/setup/testcontainers.ts` SHALL be `pgvector/pgvector:pg18`.

#### Scenario: Root docker-compose declares the pgvector image

- **WHEN** `docker-compose.yml` at the repository root is inspected
- **THEN** the `postgres` service `image` field SHALL be `pgvector/pgvector:pg18`

#### Scenario: Database package docker-compose declares the pgvector image

- **WHEN** `packages/database/docker-compose.yml` is inspected
- **THEN** the `postgres` service `image` field SHALL be `pgvector/pgvector:pg18`

#### Scenario: Testcontainers config declares the pgvector image

- **WHEN** `apps/api/test/setup/testcontainers.ts` is inspected
- **THEN** the `TEST_DATABASE_CONFIG.image` field SHALL be `pgvector/pgvector:pg18`

#### Scenario: Migration succeeds against the pgvector-bundled image

- **WHEN** the Prisma migration suite is applied against a fresh container started from `pgvector/pgvector:pg18`
- **THEN** every migration SHALL succeed and `pg_extension` SHALL contain a row with `extname = 'vector'`

### Requirement: Migration installs the pgvector extension

The Prisma migration that introduces the `embedding` column SHALL begin with `CREATE EXTENSION IF NOT EXISTS vector` so the `vector(1024)` declaration is valid and re-applying is idempotent.

#### Scenario: Migration SQL contains the extension creation

- **WHEN** the generated `*.sql` for the V1 RAG MVP migration is inspected
- **THEN** the file SHALL contain `CREATE EXTENSION IF NOT EXISTS vector` before any reference to the `vector(1024)` type

#### Scenario: Re-applying the migration is idempotent on the extension

- **WHEN** the migration is applied a second time against an already-applied database
- **THEN** the `CREATE EXTENSION IF NOT EXISTS vector` statement SHALL succeed without error

### Requirement: Chatbot corpus chunk table carries a vector(1024) embedding column

`chatbot_corpus_chunk` SHALL declare an `embedding` column of type `vector(1024)`, nullable. The Prisma schema declares `embedding Unsupported("vector(1024)")?`. I/O via `prisma.$queryRaw` / `$executeRaw`. The column SHALL NOT be selectable through the typed Prisma client. Nullability is forward-looking; V1 ingest always inserts non-NULL.

#### Scenario: Column exists and is nullable in the database

- **WHEN** `\d chatbot_corpus_chunk` is run on a database where the migration has been applied
- **THEN** the result SHALL include a column `embedding` of type `vector(1024)` declared as nullable

#### Scenario: Prisma schema declares Unsupported annotation

- **WHEN** the `ChatbotCorpusChunk` model in `packages/database/src/prisma/schema.prisma` is inspected
- **THEN** the model SHALL declare a field exactly matching `embedding Unsupported("vector(1024)")?`, including the trailing `?`

#### Scenario: Embedding column is not selectable via the typed client

- **WHEN** TypeScript compiles `prisma.chatbotCorpusChunk.findFirst({ select: { embedding: true } })`
- **THEN** the compiler SHALL reject because the typed `select` shape SHALL NOT include `embedding`

#### Scenario: V1 ingest pipeline writes non-NULL embeddings

- **WHEN** the ingest CLI inserts chunk rows for a corpus source
- **THEN** every inserted `chatbot_corpus_chunk` row SHALL have a non-NULL `embedding` value of length 1024

### Requirement: Migration creates an HNSW index on embedding using cosine ops

The migration SHALL create `chatbot_corpus_chunk_embedding_hnsw_idx` on `chatbot_corpus_chunk.embedding` using `vector_cosine_ops` with `m = 16` and `ef_construction = 64`. Search-time `ef_search` SHALL NOT be pinned by the migration.

#### Scenario: HNSW index exists with cosine ops class

- **WHEN** `\d chatbot_corpus_chunk` is run on an applied database
- **THEN** the output SHALL list an HNSW index named `chatbot_corpus_chunk_embedding_hnsw_idx` over `embedding` using `vector_cosine_ops`

#### Scenario: Migration SQL specifies the default index parameters

- **WHEN** the generated `*.sql` for the V1 RAG MVP migration is inspected
- **THEN** the index creation statement SHALL include `WITH (m = 16, ef_construction = 64)` and SHALL specify `vector_cosine_ops`

#### Scenario: Search-time ef_search is not pinned by the migration

- **WHEN** the migration SQL is inspected
- **THEN** it SHALL NOT contain a `SET hnsw.ef_search` statement; left at the pgvector default of 40

### Requirement: Chatbot corpus tables become active in this change

The corpus tables (`chatbot_corpus_source`, `chatbot_corpus_chunk`, `chatbot_corpus_ingest_run`) SHALL cease to be dormant. `chatbot_corpus_source` is written by ingest/activate; `chatbot_corpus_chunk` is written by ingest with non-NULL embeddings and read by retrieval; `chatbot_corpus_ingest_run` is written as audit history with no read paths in this change.

#### Scenario: Ingest CLI writes to corpus_source and corpus_chunk

- **WHEN** the ingest CLI runs successfully on a valid PDF
- **THEN** exactly one new row SHALL exist in `chatbot_corpus_source` with `status = 'DRAFT'`, and one or more new rows SHALL exist in `chatbot_corpus_chunk` with non-NULL `embedding`, all linked via `source_id`

#### Scenario: Activate CLI updates corpus_source

- **WHEN** the activate CLI runs successfully on a `DRAFT` source id
- **THEN** the targeted row SHALL transition to `ACTIVE` with non-NULL `activated_at`, and any prior `ACTIVE` of the same `(name, scope)` SHALL transition to `OUTDATED` with non-NULL `deactivated_at`

#### Scenario: Retrieval function reads from corpus_chunk

- **WHEN** `searchKnowledge` is called with a non-empty query
- **THEN** the implementation SHALL execute SQL against `chatbot_corpus_chunk` joined with `chatbot_corpus_source`

#### Scenario: Ingest CLI writes audit row to corpus_ingest_run

- **WHEN** the ingest CLI runs (successfully or not)
- **THEN** exactly one new row SHALL exist in `chatbot_corpus_ingest_run` with `started_at` populated, `triggered_by` populated, `embedding_model` populated with the resolved model, and `completed_at`/`chunks_created` populated only on success

## REMOVED Requirements

### Requirement: Corpus tables are dormant in this change

This requirement is REMOVED. V1 RAG MVP lifts the dormancy: corpus tables are read by retrieval and written by the ingest/activate CLI. `apps/api/test/features/chatbot/lint/noReferencesToCorpusTables.test.ts` SHALL be deleted.

### Requirement: Migration is forward-compatible with V1 RAG ingestion

This requirement is REMOVED. Foundation's forward-compatibility constraint is fulfilled: this migration adds the `vector` extension, `embedding vector(1024)`, and the HNSW index without altering any column shipped by foundation.
