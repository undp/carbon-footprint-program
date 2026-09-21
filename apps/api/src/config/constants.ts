/** Number of decimal places for percentage values (0–1 range) */
export const PERCENTAGE_PRECISION = 3;

/** Allowed delta when comparing gasDetails totals against declared emission value */
export const EMISSION_FACTOR_GAS_DETAILS_TOLERANCE = 1e-4;

/**
 * Expiry (minutes) for the presigned read URLs returned by the
 * carbon-inventory files manifest endpoint. A dedicated constant so it can be
 * tuned independently when a large inventory's tail of file downloads risks
 * running past the URL's validity window.
 */
export const CARBON_INVENTORY_FILES_MANIFEST_READ_URL_EXPIRY_MINUTES = 15;

/** Allowed MIME types for badge uploads */
export const BADGE_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/svg+xml",
  "image/jpeg",
  "image/webp",
] as const;

/** Maximum badge file size in bytes (5 MB) */
export const BADGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

// Must match the value used in the organization_summary_view SQL migration
export const MEASURING_ORGANIZATIONS_YEAR_RANGE = 2;

/** Max tokens accepted on a single user chat message before HTTP 413. */
export const CHATBOT_MAX_USER_INPUT_TOKENS = 4000;

/**
 * Chatbot turns accepted per minute from one client IP, on top of the global
 * 100 req/min limiter.
 *
 * The global limit counts requests, and a chatbot request is not like the
 * others: it can cost several thousand tokens where the rest of the API costs
 * none. 100 model invocations per minute per IP is a hole in the cost floor.
 *
 * Keyed by IP rather than by caller identity, and not by choice.
 * `@fastify/rate-limit` runs in `onRequest`; `chatbotIdentityPreHandler`
 * resolves the caller in `preHandler`, which is strictly later. A keyGenerator
 * cannot read `request.chatbotIdentity` because it does not exist yet. The
 * identity-scoped controls live where the identity does — see the token budget
 * and the anonymous pool below.
 *
 * This layer is what bounds overshoot the token budgets structurally cannot
 * see: those are read before a turn and credited after it, so simultaneous
 * turns all pass the same stale total. Capping turns per minute caps how far
 * past the budget a burst can carry.
 *
 * Sized so a room of people demoing behind one NAT does not notice — they share
 * a bucket, which is the accepted cost of a limit that must run before identity
 * is known.
 *
 * This is the DEFAULT. The effective value is `CHATBOT_MAX_TURNS_PER_MINUTE` in
 * config/environment.ts, which a deployment may raise — a country whose users
 * all egress through one address may legitimately need more, and the
 * integration suite drives more turns per file than any caller would in a
 * minute.
 */
export const CHATBOT_MAX_TURNS_PER_MINUTE_DEFAULT = 15;

/**
 * Tokens one caller identity may consume in a rolling 24 hours.
 *
 * The layer that catches an accident: a stuck tab, a client retry loop, a
 * single person exploring far past what a demo needs. It is explicitly NOT the
 * cost ceiling, because the identity it keys on costs nothing to replace — an
 * anonymous caller discards the session cookie and starts fresh, and
 * third-party cookie restrictions produce the same effect with no attacker at
 * all. `CHATBOT_MAX_ANONYMOUS_TOKENS_PER_DAY` is the layer that cannot be
 * evaded; this one keeps one accident from draining it for everybody.
 *
 * At roughly 13% of the anonymous pool, it takes about seven identities at
 * their limit to exhaust the shared budget — enough headroom that one runaway
 * client is contained rather than fatal.
 */
export const CHATBOT_MAX_TOKENS_PER_IDENTITY_PER_DAY = 40_000;

/**
 * Tokens ALL anonymous callers may consume between them in a rolling 24 hours.
 *
 * Keyed on the absence of `user_id`, which is the one thing about an anonymous
 * caller that nothing they control can change. Discarding the cookie mints a
 * new identity and draws on the same pool, so this is the only layer with no
 * cheap evasion, and therefore the only one that actually bounds spend.
 *
 * Sized as the daily equivalent of the most conservative scenario the team
 * modelled — about 10 USD/month at 300 users — so thirty consecutive days at
 * the cap cost roughly a third of the configured monthly budget. In turns it is
 * near thirty a day across every anonymous caller combined: an ordinary day of
 * demonstration, and not much beyond it.
 *
 * The pool covers anonymous traffic only, so sizing it against a whole modelled
 * scenario assumes every caller is anonymous — conservative by construction,
 * and accurate early on.
 *
 * It converts an unbounded cost risk into a bounded availability risk: one
 * actor can exhaust it and deny the anonymous chatbot to everyone until the
 * window rolls. That is accepted. Authenticated callers do not draw on this
 * pool and keep service throughout, which is why the pool's rejection message
 * names signing in — it is a real remedy, not a consolation.
 */
export const CHATBOT_MAX_ANONYMOUS_TOKENS_PER_DAY = 300_000;

/**
 * Window both token budgets are measured over.
 *
 * A rolling 24 hours from the moment of evaluation, not a calendar day: a
 * calendar reset hands every caller a fresh allowance at the same instant,
 * which is precisely when a burst is least welcome.
 *
 * Both budgets are read BEFORE a turn and credited AFTER it, so simultaneous
 * turns all pass against the same stale total. The overshoot is bounded by
 * concurrency times per-turn cost, and bounding concurrency is what
 * CHATBOT_MAX_TURNS_PER_MINUTE_DEFAULT is for.
 *
 * What they measure is an undercount. `tokens_used` records only the terminal
 * round, and forcing `tool_choice` makes every turn a tool turn, so the first
 * round is never counted. Both layers inherit that undercount uniformly, which
 * makes them consistent with each other and conservative about nothing.
 */
export const CHATBOT_TOKEN_BUDGET_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Token budget for a single request to the provider: system prompt, the
 * incoming user message, and as much prior history as still fits.
 *
 * Not a rejection threshold. History past the budget is dropped from the
 * oldest end by `trimHistoryToBudget`, so a long conversation degrades by
 * forgetting its start rather than by refusing to continue.
 */
export const CHATBOT_MAX_HISTORY_TOKENS = 8000;

/** Max tokens reserved for RAG context per turn (declared now, unused until V1). */
export const CHATBOT_MAX_RAG_CONTEXT_TOKENS = 12000;

/** Max tokens the LLM may produce in a single turn. */
export const CHATBOT_MAX_OUTPUT_TOKENS = 1500;

/**
 * Max messages of prior history loaded into a turn's prompt.
 *
 * A ceiling on the query, not on the conversation: the newest N are taken and
 * anything older is simply not sent to the model. It bounds how much the
 * database is asked for, so a long thread cannot grow the query unboundedly;
 * CHATBOT_MAX_HISTORY_TOKENS then bounds what of that actually fits the
 * prompt. Neither one rejects a turn — nothing does, past the size of a single
 * message.
 */
export const CHATBOT_MAX_HISTORY_MESSAGES = 50;

/**
 * Days a chatbot conversation persists before it expires, by identity kind.
 *
 * Retention follows the relationship. An authenticated caller has an account to
 * come back to, can resume from another device, and has history worth keeping.
 * An anonymous caller gets one thing from a long window — a thread that survives
 * a page reload — and loses even that whenever the browser discards the session
 * cookie, which third-party cookie restrictions already make routine. They carry
 * identical data-at-rest exposure without the benefit, so they keep less.
 *
 * Holding less of the data belonging to people there is no way to contact is the
 * largest reduction in exposure available here, and the only one that asks
 * nothing of anyone: what is not retained cannot be the subject of an erasure
 * request, under every framework at once, with nobody interpreting any of them.
 *
 * Compile-time constants rather than environment variables, deliberately.
 * Adapting the mechanism — anything beyond the number — needs code anyway, and
 * the widget's retention notice is rendered by a different application: making
 * these configurable would force that notice through a new endpoint, a
 * build-time variable that reinstates the rebuild it was meant to avoid, or a
 * vaguer sentence. See CHATBOT_RETENTION_NOTICE in apps/web, which states the
 * 30-day ceiling because overstating retention is harmless and understating it
 * is not.
 *
 * Nothing deletes expired rows yet: `expires_at` is written and every read
 * filters on it, so an expired conversation is invisible to the user and still
 * present in a database dump. Physically deleting them is the
 * `chatbot-conversation-purge` change. Until it lands, a shorter window
 * shortens visibility rather than storage.
 */
export const CHATBOT_CONVERSATION_TTL_DAYS = 30;
export const CHATBOT_ANONYMOUS_CONVERSATION_TTL_DAYS = 7;

/**
 * Overall wall-clock budget (ms) for a single LLM streaming completion. Bounds
 * total stream duration so a stuck upstream cannot hold the request open until
 * the SDK's ~600s default.
 */
export const CHATBOT_LLM_STREAM_TIMEOUT_MS = 120_000;

/**
 * Idle budget (ms) between stream frames. Fires when the provider accepts the
 * request but stops emitting tokens, so a stalled stream fails fast instead of
 * waiting out the overall budget.
 */
export const CHATBOT_LLM_STREAM_IDLE_TIMEOUT_MS = 30_000;

/**
 * Per-address budget (ms) for Node's Happy Eyeballs connection attempts
 * (`autoSelectFamilyAttemptTimeout`). Node 20–24 default it to 250ms, which
 * aborts every outbound connection — http/https (JWKS key download, storage
 * SDKs) and fetch alike — on links whose TCP connect exceeds it (VPNs,
 * deployments far from the identity provider), rejecting all logins with 401.
 * Known upstream issue (nodejs/node#54359); Node 25.2 raised its default to
 * only 500ms, too tight for high-RTT links, so we set the 2500ms value
 * originally proposed upstream (nodejs/node#56738).
 */
export const NETWORK_CONNECTION_ATTEMPT_TIMEOUT_MS = 2500;

/**
 * Transaction budgets for the operator-run corpus CLIs (`chatbot:ingest`,
 * `chatbot:activate`).
 *
 * Prisma's defaults — 2s to acquire a transaction, 5s to run it — are tuned for
 * a request handler, where failing fast is the right answer. These are batch
 * maintenance commands: ingest inserts one row per chunk of a document, and
 * activate performs a DRAFT → ACTIVE → OUTDATED cutover that must not be left
 * half-applied. Both are better off waiting than aborting, especially when the
 * database is busy — the CI suite reproduced exactly that, with activate dying
 * on "Unable to start a transaction in the given time" while other test files
 * held connections.
 */
export const CHATBOT_CORPUS_CLI_TX_MAX_WAIT_MS = 30_000;
export const CHATBOT_CORPUS_CLI_TX_TIMEOUT_MS = 120_000;
