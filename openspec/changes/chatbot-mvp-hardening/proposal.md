## Why

The chatbot ships to production with no ceiling on what it can spend and no process that enforces the retention it promises. Spend is bounded only by the Azure TPM quota — a physical cap, not a budget — while the request-per-minute limit counts requests, and a chatbot request can cost four thousand tokens where the rest of the API costs zero. Retention is worse than unbounded: `expires_at` is written and every read respects it, but nothing ever deletes, so a database dump still carries conversations the product has told the user are gone.

Both gaps close before the corpus grows, not after. The similarity floor in particular is harmless today because a five-page corpus falls back on almost everything; it becomes the difference between "I don't know" and a confident answer resting on a barely-related fragment exactly when the full corpus lands.

## What Changes

- **Three-layer spend control.** A per-route burst limit keyed by IP; a per-identity daily token budget; and a global daily token pool shared by all anonymous callers. The layers exist because each one alone is evadable: an anonymous identity is a cookie the caller can discard for free, and third-party cookie restrictions already make identity churn routine rather than exceptional, which silently neuters any per-identity counter. The global pool is the only layer with no cheap evasion.
- **Three distinct 429 bodies** — burst, personal budget, and shared pool — because only the third has an immediate remedy (sign in; authenticated callers do not draw on the pool), and one generic message hides it.
- **Tiered retention** — anonymous conversations expire in 7 days, authenticated in 30. **BREAKING** for anonymous callers: a thread abandoned for more than a week no longer rehydrates. The asymmetry follows the relationship: an authenticated user has an account to return to, while an anonymous one gains only surviving a page reload and carries the same data-at-rest exposure without the benefit.
- **Two standing notices at the foot of the chat panel**, unconditional and undismissable: that answers are model-generated and must be checked against the cited sources, and that conversations are kept up to 30 days and personal data should not be shared. The retention notice states the maximum rather than the tier, because overstating retention is harmless while understating it is a privacy assurance the system does not keep.
- **Retrieval always runs.** The decision to search leaves the system prompt and becomes a forced tool call, so the model no longer arbitrates something it evaluates poorly — recommendation-shaped questions currently skip retrieval and reach the fallback with the answer sitting in the corpus.
- **A similarity floor applied in TypeScript**, after the query rather than in its `WHERE`, so the HNSW plan stays driven by `ORDER BY ... LIMIT`. Rows below the floor are dropped; an empty result is the existing K=0 path with its existing honest opener, so no new copy is written. The value ships provisional and instrumented — the first result's similarity is logged on every query so it can be calibrated against real data instead of guessed twice.
- **Cost alerting in Bicep**, gated by `enableChatbot` like the rest: an action group, a monthly consumption budget with warnings at 50/80/100%, and an Azure Monitor alert on tokens processed per hour. Two alarms rather than one because Azure billing lags roughly eight hours — the budget sees real money late, the metric sees abuse in minutes, and neither of them stops anything. The TPM quota remains the only hard ceiling.
- **An emergency shutdown runbook** for the existing kill switch, including that `VITE_CHATBOT_ENABLED` is build-time, so disabling the backend leaves the widget visible but unserviced until the frontend is rebuilt.

Deliberately **not** in this change:

- **No user-facing delete affordance.** `chatbot-rag-mvp` design decision 25 defers it. The gap that argued against that deferral is real — support cannot invoke a delete that acts on the caller's own identity, so an anonymous erasure request has no operator path — and this change narrows it by shortening the anonymous window to 7 days rather than closing it. **Physically deleting expired rows moved to `chatbot-conversation-purge`**, so until that lands, a shorter window shortens visibility rather than storage. The decision stands for this change; whoever revisits it should weigh that the mitigation is now partial.
- **No evaluation suite.** `chatbot-rag-mvp` states its prerequisites: the operator-supplied corpus and golden questions written by a domain expert. Neither exists, and building against an unmet precondition produces a test that asserts noise. It waits on the corpus being defined.
- **No corpus ingestion.** Requires the real documents, Azure access, and the `Cognitive Services OpenAI User` role.

## Capabilities

### New Capabilities

- `chatbot-usage-quotas`: the three spend-control layers, their windows and keys, the order they are evaluated in, and the distinct rejection body each one returns.
- `chatbot-cost-alerting`: the Bicep action group, consumption budget, and token-rate metric alert, including the explicit statement that neither alarm throttles anything.

### Modified Capabilities

- `chatbot-conversation-persistence`: retention becomes tiered by identity kind rather than a flat 30 days.
- `chatbot-widget`: the foot-of-chat area carries a retention notice alongside the existing generated-content disclaimer, and the disclaimer's wording changes.
- `chatbot-message-streaming`: retrieval is no longer the model's decision, and a turn can now be refused before reaching the model when a quota is exhausted.
- `chatbot-corpus-retrieval`: retrieved rows below a similarity floor are discarded before they reach the model.

**Prerequisite.** `chatbot-corpus-retrieval` and `chatbot-message-streaming`'s tool-round behavior arrive with `chatbot-rag-mvp`, which is not archived. This change's deltas assume that one lands first; archiving them out of order leaves the main specs describing a retrieval capability that does not yet exist.

## Impact

- **API**: `sendMessage` gains a pre-model quota check and a forced tool choice; `searchKnowledge` filters and logs similarity; retention branches on identity kind.
- **Web**: the chat panel's footer renders two notices instead of one. No other surface changes; no delete control is added.
- **Database**: no schema change. The existing identity indexes serve the budget query.
- **Infrastructure**: a new Bicep module for alerting, gated by `enableChatbot`, with the monthly budget amount as a parameter.
- **Docs**: `docs/operations/runbook.md` gains the shutdown procedure and a summary of the cost controls; `docs/security/sensitive-data.md` retention section is corrected to describe tiered retention.
- **Cost**: bounded for the first time. The anonymous pool caps the worst month at the configured budget; before this change nothing did.
