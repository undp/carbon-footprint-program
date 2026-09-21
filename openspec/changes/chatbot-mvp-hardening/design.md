## Context

The chatbot works and is unprotected. Spend has no ceiling below the Azure TPM quota, which is a physical throughput cap rather than a budget. The request-per-minute limiter counts requests, and a chatbot request can cost four thousand tokens where every other API request costs none. Retention is written and read but never enforced: `expires_at` is set at creation, every query filters on it, and nothing deletes, so the rows accumulate indefinitely and a database dump still carries conversations the product has told the user are gone.

Two properties of the deployment shape every decision here. The frontend is a Static Web App and the API is an App Service on a different registrable domain, so the anonymous session cookie is a third-party cookie — `SameSite=None; Secure` — and the repository already documents that browsers discarding it is "a routine event, not an edge case". And the corpus is currently one five-page chapter, which masks retrieval-quality problems that will surface the moment it grows.

`chatbot-rag-mvp` is not archived. Its deltas introduce the retrieval capability and the tool round that this change modifies, so this change's specs assume it lands first.

## Goals / Non-Goals

**Goals:**

- Put a ceiling on chatbot spend that cannot be removed by discarding a cookie.
- Stop the model from deciding whether to search, and stop weak fragments from reaching it.
- Give an operator a written procedure for shutting the chatbot off under pressure.
- Make cost visible early enough to act, while being explicit that nothing added here throttles.

**Non-Goals:**

- A user-facing delete affordance. Examined and deliberately not added — see Decision 6.
- An evaluation suite. Its stated prerequisites do not exist yet — see Decision 8.
- Corpus ingestion. Requires the real documents, Azure access, and an operator role.
- A hot kill switch. The environment flag with a one-minute restart is sufficient for an MVP; a database-backed flag adds a table, an admin endpoint, and a cache.
- Per-deployment configurability of the retention window — see Decision 5.

## Decisions

### Decision 1 — Three spend layers, not one

Burst by IP, a per-identity daily token budget, and a global daily pool for all anonymous callers.

**Rationale**: each layer alone is insufficient, and the reasons differ. The burst limiter runs in `onRequest`, before `chatbotIdentityPreHandler` populates `request.chatbotIdentity`, so it cannot key on identity — an ordering constraint, not a preference. The per-identity budget is keyed on a value the caller can discard at zero cost, and third-party cookie restrictions produce the same effect with no attacker at all: every turn arrives as a fresh identity and the counter never accumulates, silently. The global pool is keyed on the absence of `user_id`, which nothing the caller controls can change.

**Alternatives considered**: keying the burst limiter on the signed cookie via `request.unsignCookie` — rejected because it duplicates identity resolution outside its module and is evaded by the same cookie discard, so it buys precision in the layer that least needs it. Per-identity budget alone — rejected because it is the layer that fails silently under conditions the repository already calls routine.

### Decision 2 — The anonymous pool trades cost risk for availability risk

A single actor can exhaust the shared pool and deny the anonymous chatbot to everyone until the window rolls.

**Rationale**: accepted deliberately. For a demo deployment with a real budget and no revenue, losing availability is preferable to losing money, and the TPM quota already degrades service under abuse regardless. The mitigation is built into the asymmetry: authenticated callers do not draw on the pool, so signing in is a genuine remedy, which is why the pool's rejection message names it.

**Alternative considered**: no pool, per-identity only — rejected per Decision 1.

### Decision 3 — Daily window, sized independently of the monthly budget

The pool resets every 24 hours and its size is chosen on its own merits rather than as the monthly budget divided by thirty.

**Rationale**: a monthly window does not self-heal — exhausted on the third day, the anonymous chatbot is out of service for the rest of the month. A daily window sized as budget-over-thirty would carry a hard monthly guarantee by construction, and that coupling was deliberately not adopted: tying the daily figure to an accounting period says nothing about what a day of legitimate use looks like.

Sizing it on its own merits instead, against the team's own cost model, lands at the daily equivalent of the most conservative modelled scenario — roughly 30 USD per month divided by three. Thirty consecutive days at the cap therefore cost about a third of the configured budget, so the monthly guarantee returns as a consequence of the number rather than as a constraint on it. Had the figure been chosen higher, the consumption budget alert would have been the only thing standing between a sustained cap and an overrun; at this size it has room to spare.

The remaining trade is availability, not cost: thirty turns a day across every anonymous caller combined covers an ordinary day of demonstration and not much more, so a busy week could plausibly meet the ceiling. Signing in remains the remedy, and the pool's rejection message says so.

### Decision 4 — Retention is tiered by identity kind: 7 days anonymous, 30 authenticated

**Rationale**: retention should follow the relationship. An authenticated caller has an account, can return from another device, and has history worth keeping. An anonymous caller gains only that a thread survives a page reload — a benefit already lost whenever the browser drops the session cookie — while carrying identical data-at-rest exposure. Holding less of the data belonging to people there is no way to contact is the largest available reduction in exposure and it asks nothing of anyone.

This is the change's principal compliance move. What is not retained cannot be the subject of an erasure request, and that is true under every framework in the repository's country table simultaneously, without anyone interpreting any of them.

**Alternatives considered**: one day for anonymous — rejected because a thread vanishing overnight reads as a defect rather than a policy. Leaving both at thirty — rejected as retaining the maximum from the callers with the least benefit.

**Scope boundary**: this sets the window; it does not enforce it. Nothing deletes expired rows in this change, so a shorter window shortens how long a conversation is visible rather than how long it is stored. Physically deleting them is `chatbot-conversation-purge`.

### Decision 5 — The retention windows stay compile-time constants

**Rationale**: an environment variable would let a deployment change the window without rebuilding, which matters most for the air-gapped on-premise topology. It was rejected anyway, for two reasons. Adapting the _mechanism_ — anything beyond the number — requires code regardless, so configurability of the value buys less than it appears. And the widget's retention notice is rendered by a different application: if the API's window becomes an environment variable, the notice can only follow it through a new endpoint, or a build-time variable that reintroduces the rebuild it was meant to avoid, or by dropping the number and becoming vague.

### Decision 6 — `chatbot-rag-mvp` Decision 25 is upheld: no delete affordance

**Rationale**: this change examined that decision and confirmed it.

The argument that had been raised against it is real and worth recording. Decision 25 holds that the erasure obligation is met by support invoking `DELETE /api/chatbot/conversations/me`. That endpoint acts on the identity of whoever calls it, and an anonymous caller's identity is a signed `HttpOnly` cookie — support can neither read it nor act on its behalf. The repository's own runbook documents the consequence, describing a manual SQL purge for "an ad-hoc retention request that the right-to-be-forgotten endpoint cannot satisfy because the user has no active session". So for anonymous callers the declared channel cannot act at all; that is impossibility, not latency.

It is narrowed without the affordance. The 7-day anonymous window (Decision 4) reduces how long the exposure lasts, for every anonymous caller rather than only the ones who ask. It is a partial mitigation while the physical delete lives in `chatbot-conversation-purge` and has not landed: until then the window shortens visibility rather than storage. Whoever revisits Decision 25 should weigh that honestly.

Two further notes for whoever revisits this. "D11" is a design-decision identifier in `chatbot-foundation`, not a legal article; it reads "A `DELETE /api/chatbot/conversations/me` endpoint lets callers delete their own history at will", and "at will" is what Decision 25 reinterpreted as support-operated. And the repository states in `docs/security/sensitive-data.md` that the team does not certify compliance and that the deploying country declares it — which makes any claim that an obligation "is met" the kind of statement that document says the team should not be making, in either direction.

**Consequence**: the `ChatbotWidget.tsx` comment explaining why `deleteHistory` is unwired remains accurate and stays. The existing widget test asserting the absence of a deletion control stays unchanged. `chatbot-rag-mvp` tasks 9.7 and 10.38 remain correctly deferred, and archiving that change after this one creates no contradiction.

### Decision 7 — Forced `tool_choice`, not a pre-retrieval refactor

**Rationale**: the goal is to remove a decision the model makes badly — recommendation-shaped questions do not read as lookups, so they skip retrieval and reach the fallback while the answer sits unread. Forcing the first round's `tool_choice` achieves that with one provider flag and a prompt amendment, preserving the single-round tool architecture and its existing test surface.

**Alternative considered**: retrieving server-side before the first completion and dropping the tool entirely. It is architecturally cleaner and _cheaper_ — one round per turn instead of two — but it removes the tool round the handler is built around and rewrites the bulk of its integration coverage. Right-sizing won; the cheaper design is worth revisiting if turn cost becomes a problem.

**Cost accepted**: every turn now pays one embedding and two rounds, including greetings. The prompt must be amended so the non-retrieval modes stay correct when a forced search returns nothing — otherwise a greeting would open with the K=0 literal.

### Decision 8 — The similarity floor is applied in TypeScript and ships provisional

**Rationale for the placement**: the HNSW index is chosen by the `ORDER BY ... LIMIT` shape. A similarity predicate in `WHERE` risks a different plan for no gain, since the filter runs over at most eight rows.

**Rationale for the value**: 0.45 errs high on purpose. Of the three outcomes an evaluation would measure, answering confidently and wrongly is the one that matters, and a low floor is what produces it. A figure near 0.35 is commonly cited for this embedding model, but that is a reference point, not a measurement of this corpus. The handler logs the top similarity of every retrieval so the value can be replaced by a measurement rather than a second guess.

### Decision 9 — Three rejection messages, not one

**Rationale**: the three quota layers have different remedies — wait seconds, wait for the window, or sign in. Only the third has an immediate one, and it is invisible under a generic message. The cost is that the pool's message confirms to an abuser that the pool is exhausted; that is accepted, since silence would not deter them and does confuse everyone else.

### Decision 10 — Budget default of 30 USD per month

**Rationale**: taken from the team's own cost modelling — roughly 10 USD/month at 300 users, 27 at 500, 108 at 1000. Thirty is the value at which ordinary operation is silent (the 300-user case never reaches the 50% threshold), growth is audible (the 500-user case trips 50% and 80%), and an anomaly is unmistakable (the 1000-user case exceeds all three). A default calibrated so that the first threshold fires during normal use would train everyone to ignore it.

## Risks / Trade-offs

- **One actor can deny the anonymous chatbot for a day** → accepted per Decision 2; authenticated callers keep service and the rejection message tells anonymous callers so.
- **The per-identity budget measures an undercount** → `tokens_used` records only the terminal round, and forcing `tool_choice` makes every turn a tool turn, so the first round is never counted. Documented on the constant; the pool is the layer that actually bounds spend, and it inherits the same undercount uniformly.
- **Quota checks read before the turn and credit after it** → concurrent turns all pass against the same stale total. Overshoot is bounded by concurrency times per-turn cost, which is what the burst limit exists to cap.
- **Thirty days at the pool cap exceeds the monthly budget** → the direct consequence of Decision 3; the consumption budget alert is the compensating control and is therefore load-bearing.
- **Callers behind one NAT share a burst bucket** → an institutional demo consumes one bucket for the room. Accepted: the limit must run before identity is known, and 15/minute is sized so a room of demo users does not notice.
- **Anonymous threads now vanish after a week** → a behavioural change for anonymous callers, mitigated by the fact that the same outcome already occurs whenever the browser drops the session cookie.
- **Forcing retrieval costs an embedding and a round on every turn, including greetings** → accepted per Decision 9; the TPM quota bounds the worst case and the new token budgets bound the expected one.
- **The similarity floor is a guess** → it is instrumented from day one and documented as provisional; the eval suite that would calibrate it is deferred with its prerequisites named.
- **Cost alerting exists only on Azure** → the on-premise deployment has no budget and no metric alert, so its only cost controls are the application-level quotas. Stated in the module and the runbook so it is not assumed to be present everywhere.
- **The metric alert's exact Azure metric name is unverified** → to be confirmed against the deployed account during implementation; if hourly aggregation does not behave as assumed, that is reported rather than worked around silently.

## Migration Plan

1. `chatbot-rag-mvp` archives first. This change's `chatbot-corpus-retrieval` delta and its `chatbot-message-streaming` tool-round modification assume that capability exists in the main specs.
2. API changes deploy together: constants, quota checks, forced tool choice, similarity floor, tiered retention. No database migration accompanies them.
3. Infrastructure deploys independently. The budget amount is a parameter; the module is inert while `enableChatbot` is false.
4. Web deploys independently — the two notices are static text with no API dependency.

**Rollback**: every element is independently revertible, and nothing here changes the schema. Raising the constants disables the quotas without a deploy of behaviour. The retention tiering affects only rows created after it ships, so reverting it neither resurrects nor destroys anything.

## Open Questions

- The exact Azure Monitor metric name and aggregation for processed tokens on the OpenAI account, to be confirmed against the deployed resource.
- The token-to-cost rate used to size the pool was derived from the team's cost modelling rather than a price list, because the model declared in the Bicep parameters and the one running on the development resource differ. The pool's token figure should be re-derived against whichever model production actually runs.
- Whether the deployment principal holds the Cost Management rights that `Microsoft.Consumption/budgets` requires. A Contributor-scoped service principal may not, and the failure surfaces only at deploy time.
- Whether the burst limit's IP bucket needs raising once real institutional traffic arrives behind a single NAT.
