## ADDED Requirements

### Requirement: Expired conversations are physically deleted by an application-run purge

The API SHALL delete rows from `chatbot_chat_conversation` where `expires_at < NOW()`, once at application start and every 24 hours thereafter. The purge SHALL run only when `CHATBOT_ENABLED` is true.

Without this, the retention promise is a written claim that nothing enforces: `expires_at` is set, every read respects it, and the rows accumulate forever, so a database dump still carries conversations the product has told the user are gone. Enforcement at the read layer satisfies the product; only deletion satisfies the data.

The purge SHALL log the number of rows deleted. If that count becomes sustainedly large, batched deletion is the documented next step; it is not required at current volumes.

#### Scenario: Expired rows are removed

- **WHEN** the purge runs and rows exist whose `expires_at` is in the past
- **THEN** those rows SHALL be deleted and the deleted count SHALL be logged

#### Scenario: Unexpired rows are untouched

- **WHEN** the purge runs
- **THEN** rows whose `expires_at` is in the future SHALL remain

#### Scenario: Messages are removed with their conversation

- **WHEN** a conversation row is deleted by the purge
- **THEN** its `chatbot_chat_message` rows SHALL be removed by the existing `ON DELETE CASCADE`, with no separate delete statement

#### Scenario: Purge does not run when the chatbot is disabled

- **WHEN** the API starts with `CHATBOT_ENABLED` false
- **THEN** no purge SHALL be scheduled or executed

### Requirement: The purge measures its own backlog before deleting

The purge SHALL read the oldest `expires_at` among rows already past expiry **before** issuing the `DELETE`, and SHALL log the resulting backlog age alongside the deleted count. When that age materially exceeds the sweep interval, it SHALL log at warning level.

The ordering is the whole mechanism. The `DELETE` removes exactly the rows the measurement reads, so measuring afterwards always yields nothing and a purge that has not run in a month reports as healthy. Measuring first converts "did the job run?" — a question nothing can answer reliably from inside the job — into "how long has the oldest expired row been waiting?", which the data answers on its own and answers correctly whatever the cause of a missed sweep: a dead timer, a container that never started, an exception nobody read.

This requirement exists because the defect being fixed is a retention promise that nothing enforced and nothing reported. A scheduled purge that silently stops reproduces that same defect one level up, and would be just as invisible.

#### Scenario: A healthy backlog after a recent sweep

- **WHEN** a sweep runs roughly one interval after a successful previous sweep
- **THEN** the measured backlog SHALL be no larger than approximately that interval, and SHALL be logged at informational level

#### Scenario: A large backlog raises a warning

- **WHEN** a sweep measures a backlog materially larger than the sweep interval
- **THEN** it SHALL log at warning level, because previous sweeps did not complete regardless of why

#### Scenario: Measurement precedes deletion

- **WHEN** a sweep executes
- **THEN** the backlog read SHALL be issued before the `DELETE`, and SHALL NOT be derived from rows remaining after it

### Requirement: Concurrent sweeps are tolerated rather than coordinated

The purge SHALL NOT take an advisory lock or any other cross-instance coordination primitive.

PostgreSQL serializes competing `DELETE` statements against the same rows, so a second instance sweeping simultaneously finds fewer rows and reaches the same end state. The cost of a collision is duplicated work, never incorrect data. At the deployment sizes in view — commonly a single instance — a lock would protect against nothing, while introducing session-scoped versus transaction-scoped semantics that are easy to get wrong in a connection-pooled client and whose failure mode is a permanently disabled purge.

If the deployment later runs many instances and the delete volume grows enough for contention to matter, a transaction-scoped advisory lock is the documented next step; the session-scoped variant is not, because its unlock can be issued on a different pooled connection than the one holding it and then fails silently.

#### Scenario: Two instances sweeping at once both succeed

- **WHEN** two API instances execute the purge simultaneously
- **THEN** both SHALL complete without error, and no expired row SHALL survive either sweep

#### Scenario: A failed sweep does not take the API down

- **WHEN** a sweep raises
- **THEN** the error SHALL be logged and the API SHALL continue serving; the next scheduled sweep retries

### Requirement: The purge relies on the existing expires_at index

The purge SHALL use the `chatbot_chat_conversation_expires_at_idx` index already declared in raw SQL in the chatbot migration, and SHALL NOT require any new index or schema change.

#### Scenario: No migration accompanies the purge

- **WHEN** the purge ships
- **THEN** no new index, column, or table SHALL be introduced for it
