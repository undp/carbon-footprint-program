## ADDED Requirements

### Requirement: Retrieved rows below a similarity floor are discarded before reaching the model

The retrieval path SHALL discard rows whose `similarity` is below `CHATBOT_MIN_SIMILARITY` before they are formatted into the tool result. The constant SHALL live in `apps/api/src/config/constants.ts`.

The `LIMIT` returns its full quota of rows whatever their quality, so without a floor the model is handed eight fragments even when all eight are barely related. With a five-page corpus this is harmless because nearly everything reaches the fallback anyway; with the full corpus it becomes the difference between an honest "I have no verified sources" and a confident answer resting on a fragment that does not support it. The risk grows with the corpus, so the floor has to precede the ingestion rather than follow it.

#### Scenario: Weak rows are dropped

- **WHEN** retrieval returns rows whose similarity is below the floor
- **THEN** those rows SHALL NOT appear in the tool result handed to the model

#### Scenario: Strong rows are kept

- **WHEN** retrieval returns rows whose similarity is at or above the floor
- **THEN** those rows SHALL be passed through unchanged, in their existing order

#### Scenario: All rows weak is the existing K=0 path

- **WHEN** every returned row falls below the floor
- **THEN** the tool result SHALL be the existing zero-source result, and the assistant SHALL use the existing K=0 opener; no new user-facing copy SHALL be introduced

### Requirement: The similarity floor is applied in TypeScript, not in the SQL WHERE clause

The floor SHALL be applied to the result rows in TypeScript after the query returns. It SHALL NOT be expressed as a predicate in the vector query's `WHERE` clause.

The HNSW index is selected by the `ORDER BY ... LIMIT` shape of the query. Adding a similarity predicate to `WHERE` invites a different plan, and the gain would be nil: the filter runs over at most `topK` rows, so its cost in application code is not measurable.

#### Scenario: The vector query keeps its existing shape

- **WHEN** the retrieval SQL is inspected
- **THEN** it SHALL retain its `ORDER BY` distance with `LIMIT` and SHALL NOT carry a similarity threshold predicate in `WHERE`

### Requirement: The similarity floor ships as an explicitly provisional value

`CHATBOT_MIN_SIMILARITY` SHALL ship at 0.45 and SHALL be documented in the constant itself as provisional and awaiting measurement.

The value is chosen conservatively: it discards fragments that are merely related as well as those that are tangential, so the assistant declines more often rather than answering from weak support. That bias is deliberate — of the three outcomes an evaluation would measure, answering confidently and wrongly is the one that matters, and it is the one a low floor produces. A figure near 0.35 is often cited as typical for this embedding model, but it is a reference point rather than a measurement of this corpus.

#### Scenario: The constant declares its own provisionality

- **WHEN** `CHATBOT_MIN_SIMILARITY` is read
- **THEN** its documentation SHALL state that the value is provisional, why it errs high, and that it is to be replaced by a measurement once a real corpus and an evaluation set exist

### Requirement: The embedding-model coupling of retrieval is documented

The retrieval module SHALL document that the vector query filters on `chatbot_corpus_source.embedding_model`, and that changing the configured embedding model therefore makes the entire previously ingested corpus invisible to retrieval with no error raised anywhere.

The failure is silent and total: no exception, no empty-result warning distinguishable from a genuine miss — the assistant simply begins answering that it has no verified sources. A model change obliges a full re-ingestion, and that consequence is only obvious to someone who has already read this query.

#### Scenario: The coupling is stated where the filter lives

- **WHEN** the retrieval module is read
- **THEN** it SHALL carry a comment stating that an embedding-model change requires re-ingesting the corpus, and that the failure mode is silent
