## ADDED Requirements

### Requirement: Chatbot spend is bounded by three independent layers

The system SHALL bound chatbot spend with three layers evaluated in order: a per-route burst limit keyed by client IP, a per-identity daily token budget, and a global daily token pool shared by all anonymous callers. Each layer SHALL be independently sufficient to refuse a turn.

The layering is load-bearing rather than defensive redundancy. The burst limit runs in `onRequest`, before `chatbotIdentityPreHandler` resolves the caller, so it cannot key on identity. The per-identity budget can be reset by discarding the session cookie, and third-party cookie restrictions already cause identity churn without any attacker, so it cannot be the cost ceiling. The global pool is the only layer with no cheap evasion, and therefore the only one that actually bounds spend.

#### Scenario: Each layer refuses independently

- **WHEN** any one of the three limits is exhausted for a turn
- **THEN** the turn SHALL be refused with HTTP 429 before the LLM provider is invoked, regardless of the other two layers having headroom

#### Scenario: Burst layer cannot key on identity

- **WHEN** the burst limiter's `keyGenerator` executes
- **THEN** it SHALL derive its bucket from `request.ip` through the shared `toRateLimitKey` normalization, and SHALL NOT read `request.chatbotIdentity`, which is not yet populated at `onRequest`

### Requirement: Burst limit caps chatbot turns per minute per IP

`POST /api/chatbot/message` SHALL carry a route-level `@fastify/rate-limit` configuration of `CHATBOT_MAX_TURNS_PER_MINUTE` requests per one-minute window, keyed by normalized client IP.

The effective value SHALL be read from the environment in `config/environment.ts`, defaulting to `CHATBOT_MAX_TURNS_PER_MINUTE_DEFAULT = 15` in `config/constants.ts`, and SHALL be rejected at boot if it is not an integer of at least 1. Unlike the retention windows, this one is per-deployment: a country whose users all egress through one address shares a single bucket and may legitimately need a higher ceiling, and the integration suite drives more turns per file than any real caller would in a minute — the limiter's store lives on the app instance, and the chatbot suites build one app per file.

This layer exists because the token budgets are consulted before a turn and credited after it, so concurrent turns all pass the check against the same stale total. The burst limit is what bounds that overshoot.

#### Scenario: Turns beyond the per-minute cap are refused

- **WHEN** a single IP issues more than `CHATBOT_MAX_TURNS_PER_MINUTE` requests to `POST /api/chatbot/message` within one minute
- **THEN** the excess requests SHALL receive HTTP 429 and SHALL NOT reach the LLM provider

#### Scenario: A nonsensical cap is refused at boot

- **WHEN** `CHATBOT_MAX_TURNS_PER_MINUTE` is set to a non-integer, or to a value below 1
- **THEN** the API SHALL fail to start with a message naming the variable, rather than silently rate-limiting the chatbot to zero — disabling it is what `CHATBOT_ENABLED=false` is for

#### Scenario: Callers behind one NAT share a bucket

- **WHEN** several distinct people issue turns from the same public IP
- **THEN** they SHALL share one burst bucket, which is the accepted cost of a layer that must run before identity is known

### Requirement: Each identity carries a daily token budget

Before invoking the LLM provider, the system SHALL sum `chatbot_chat_message.tokens_used` for the resolved caller identity over the preceding 24 hours and SHALL refuse the turn when that sum is greater than or equal to `CHATBOT_MAX_TOKENS_PER_IDENTITY_PER_DAY`. The constant SHALL live in `apps/api/src/config/constants.ts` with a value of 40000.

The sum SHALL join `chatbot_chat_message` to `chatbot_chat_conversation` and filter on the identity columns, since messages carry no identity of their own. The query SHALL use the identity indexes already declared in the chatbot migration; any additional index SHALL be declared in raw SQL in a migration rather than as a Prisma `@@index`, matching the existing convention for these tables.

This layer's purpose is to stop an accidental runaway — a stuck tab, a client loop — from consuming the shared pool. It is explicitly NOT the cost ceiling.

#### Scenario: Identity over budget is refused

- **WHEN** the caller's tokens consumed in the preceding 24 hours are at or above the daily budget
- **THEN** the turn SHALL be refused with HTTP 429 before the LLM provider is invoked

#### Scenario: Budget is a rolling window, not a calendar day

- **WHEN** the budget is evaluated
- **THEN** the window SHALL be the preceding 24 hours from the moment of evaluation, not midnight-to-midnight

#### Scenario: Recorded consumption understates real spend

- **WHEN** a turn completes through the tool path
- **THEN** the persisted `tokens_used` SHALL reflect only the terminal round, so the budget measures a documented undercount rather than total spend; this is accepted and SHALL be stated in the constant's documentation

### Requirement: Anonymous callers draw on a shared global daily token pool

Before invoking the LLM provider for a caller whose identity kind is `session`, the system SHALL sum `chatbot_chat_message.tokens_used` across all conversations with no `user_id` over the preceding 24 hours, and SHALL refuse the turn when that sum is greater than or equal to `CHATBOT_MAX_ANONYMOUS_TOKENS_PER_DAY`. The constant SHALL live in `apps/api/src/config/constants.ts` with a value of 300000.

The figure is the daily equivalent of the most conservative scenario the team modelled — roughly 10 USD per month at 300 users — so thirty consecutive days at the cap cost about what that scenario costs in full, well under the configured monthly budget. In turns it is roughly thirty per day across every anonymous caller combined, which covers an ordinary day of demonstration and little beyond it. The pool covers anonymous traffic only, so sizing it against a whole modelled scenario assumes every caller is anonymous — conservative by construction, and accurate early on.

Authenticated callers SHALL NOT draw on this pool and SHALL NOT be refused by it. This asymmetry is deliberate: it makes signing in a genuine remedy when the pool is exhausted, and it matches the cost of minting each identity kind — an anonymous identity is free to mint, an account is not.

The pool converts an unbounded cost risk into a bounded availability risk. A single actor can exhaust it and deny the anonymous chatbot to everyone for the remainder of the window. That trade is accepted: burning availability is preferable to burning budget, and authenticated callers retain service throughout.

#### Scenario: Anonymous turn is refused when the pool is exhausted

- **WHEN** an anonymous caller issues a turn and the pool's 24-hour total is at or above the cap
- **THEN** the turn SHALL be refused with HTTP 429 before the LLM provider is invoked

#### Scenario: Authenticated callers are unaffected by pool exhaustion

- **WHEN** the anonymous pool is exhausted and an authenticated caller issues a turn
- **THEN** the turn SHALL proceed, subject only to the burst limit and that caller's own daily budget

#### Scenario: Discarding the session cookie does not restore pool headroom

- **WHEN** an anonymous caller discards the session cookie and is minted a fresh identity
- **THEN** the caller SHALL still be measured against the same global pool, because the pool is keyed on the absence of `user_id` rather than on any per-caller value

### Requirement: Each quota layer returns its own rejection message

Every quota rejection SHALL return HTTP 429 with a Spanish message specific to the layer that refused it. The three messages SHALL be distinct named constants and SHALL be written in neutral Spanish consistent with the rest of the chatbot UI.

A single generic message is insufficient because the three cases have different remedies: the burst case resolves in seconds, the personal budget resolves when the window rolls, and the pool case has an immediate remedy that is invisible unless stated.

#### Scenario: Burst rejection tells the caller to wait

- **WHEN** the burst limit refuses a turn
- **THEN** the response SHALL carry a message equivalent to `"Espera unos segundos antes de volver a preguntar."`

#### Scenario: Personal budget rejection names the daily limit

- **WHEN** the per-identity budget refuses a turn
- **THEN** the response SHALL carry a message equivalent to `"Alcanzaste tu límite de uso diario. Vuelve mañana."`

#### Scenario: Pool rejection offers signing in as the remedy

- **WHEN** the anonymous pool refuses a turn
- **THEN** the response SHALL carry a message equivalent to `"El asistente alcanzó su límite de uso diario. Inicia sesión para continuar."`, naming the remedy that actually restores service

### Requirement: Quota rejections are 429 and are distinguishable from payload rejections

Quota rejections SHALL use HTTP 429 and SHALL NOT reuse HTTP 413, which the endpoint already returns for oversized user input. The widget SHALL render the server's message for a 429 rather than substituting the generic provider-failure copy.

The widget SHALL tell the two refusals apart by the response body's `code` — `QUOTA_EXCEEDED` for a token budget, `TOO_MANY_REQUESTS` for the burst limiter — and SHALL NOT infer it from the presence of `x-ratelimit-*` headers. `@fastify/rate-limit` writes those headers on every request it admits, so a token-budget refusal raised later in the handler carries a reset value belonging to a limit that did not refuse anything. Reading it names a wait of seconds for an allowance that clears in twenty-four hours.

#### Scenario: A quota rejection carrying limiter headers is not shown as a burst

- **WHEN** a token budget refuses a turn and the response also carries `x-ratelimit-reset`
- **THEN** the widget SHALL render the `QUOTA_EXCEEDED` message and SHALL NOT render a countdown derived from that header

#### Scenario: Oversized input and exhausted quota are different statuses

- **WHEN** a turn is refused for exceeding the input size cap
- **THEN** the status SHALL be 413, and a quota refusal SHALL instead be 429, so the two are distinguishable by clients and in logs
