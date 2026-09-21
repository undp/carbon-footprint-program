## Context

`expires_at` is set once at conversation creation and filtered on by every read. Nothing deletes. Rows accumulate for as long as the tables have existed, so an expired conversation is invisible in the product and fully present in a backup.

`chatbot-mvp-hardening` shortened the anonymous retention window to 7 days and told the user, at the foot of the chat panel, that conversations are kept up to 30. Both make the absence of an actual delete more visible rather than less: the shorter window marks more rows as expired without removing any, and the notice turns an unstated gap into a written claim.

This design was built and implemented inside that change and then lifted out of it, so the hardening work could ship its spend controls without also introducing a scheduled background job. Nothing below was invalidated by that; it is the same design, waiting on the decision to run it.

## Goals / Non-Goals

**Goals:**

- Make the retention promise true at the data layer, not only at the read layer.
- Survive being forgotten: a purge that stops running must say so rather than fail silently.
- Work identically on Azure and on-premise, with no infrastructure prerequisite.

**Non-Goals:**

- Batched deletion. Warranted only if the deleted count becomes sustainedly large.
- Cross-instance coordination. See Decision 2.
- Changing what counts as expired. `chatbot-mvp-hardening` owns the windows.

## Decisions

### Decision 1 — Application purge, not `pg_cron`

A function scheduled by the API, at start and every 24 hours.

**Rationale**: `pg_cron` is a PostgreSQL extension. On Azure Flexible Server it must be added to `azure.extensions`, a server parameter that **replaces** its list rather than appending to it — an error there drops `VECTOR` and breaks the chatbot migration outright. On-premise it must be installed on the server, the same fight already fought for pgvector. Two infrastructure battles, in two deployment topologies, to execute one `DELETE`.

**Alternatives considered**: an Azure-native scheduler (Logic App, timer-triggered Function) — rejected because it does not exist on-premise and would split the implementation per topology. An internal endpoint driven by each deployment's own scheduler — rejected as an authenticated surface plus a second thing to configure per country. Opportunistic purging on write — rejected for putting deletion latency inside a user request. Table partitioning with partition drops — genuinely the most robust mechanism available and the only one rejected on implementation cost rather than portability; it is the right answer if volume ever demands it.

### Decision 2 — No cross-instance lock; measure the backlog instead

**Rationale**: PostgreSQL already serializes competing `DELETE` statements against the same rows, so two instances sweeping at once produce duplicated work and the same end state, never incorrect data. At the deployment sizes in view, commonly a single instance, a lock protects against nothing while adding semantics that are subtle to get right: `pg_try_advisory_lock` is session-scoped and taken on whichever pooled connection served the call, so its unlock can be issued on a different connection, return false, be ignored, and leave the lock held until that connection dies — permanently disabling the purge.

What earns the space instead is the measurement, which addresses a sharper problem. The defect this change fixes is a retention promise that nothing enforced and nothing reported. A scheduled purge that quietly stops reproduces that defect exactly, one level up, and would be equally invisible — which is how the current state arose. The measurement removes the question "did the job run?", which nothing inside the job can answer honestly, and replaces it with "how long has the oldest expired row been waiting?", which the data answers by itself and answers correctly whatever the cause: a dead timer, a container that never started, an exception nobody read.

**The ordering is load-bearing.** The `DELETE` removes precisely the rows the measurement reads, so measuring afterwards always reports nothing and a month-dead purge looks healthy.

**If many instances and large deletes ever coincide**, a transaction-scoped advisory lock is the next step. The session-scoped variant is not, for the reason above.

### Decision 3 — Scheduled from `onReady`, with an interval that does not hold the process

Both paths cover opposite deployment profiles: an environment that redeploys often almost never reaches the interval because every restart sweeps, while one that runs untouched for months never restarts and the interval is all there is.

`onReady` rather than registration time, so `fastify.prisma` is decorated without depending on autoload ordering. `.unref()` on the interval so a pending timer never keeps the process alive — it would otherwise hold test workers open and delay graceful shutdown by up to a day. Cleared on `onClose` so a restart cannot leave two timers running. Guarded against `createApp(withPrisma: false)`, a supported shape for tests that need no database.

A failed sweep logs and does not rethrow: a purge that cannot run is not a reason to take the chatbot down, and the next tick retries. The backlog measurement is what surfaces a sweep that keeps failing, so the failure path does not need to escalate on its own.

## Risks / Trade-offs

- **A purge that stops running would be invisible** → the defect being fixed, reproduced one level up. Addressed by measuring the backlog age before each delete and warning when it outgrows the interval.
- **The first sweep deletes everything accumulated since the tables existed** → bounded by current volume and reported through the deleted count, so the assumption is checkable rather than assumed. Its backlog reading will be large and correctly so.
- **Tied to the API's lifecycle** → a deployment whose API is down purges nothing. Accepted: an API that is down is also not accepting new conversations.
- **Not a cron** → the interval drifts and aligns to no wall-clock hour. Nothing here depends on running at a particular time.

## Migration Plan

1. Deploy the API. The purge runs on the first boot and clears the accumulated backlog in one statement.
2. Check the logged deleted count and backlog age from that first sweep. A large backlog is expected exactly once.
3. Update `docs/operations/runbook.md` and `docs/security/sensitive-data.md`, which both currently describe the purge as deferred and the manual SQL sweep as the interim measure.

**Rollback**: remove the plugin. Nothing in the schema changes, so there is nothing to undo — only rows that would otherwise have been deleted stop being deleted.

## Open Questions

- Whether the warning threshold of twice the sweep interval is the right sensitivity, or whether a deployment with an irregular restart cadence needs it looser.
- Whether the deleted count from the first production sweep is large enough to justify batching sooner than expected.
