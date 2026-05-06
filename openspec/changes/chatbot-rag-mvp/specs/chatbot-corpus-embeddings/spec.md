## ADDED Requirements

### Requirement: System exposes an EmbeddingProvider interface

The system SHALL define `EmbeddingProvider` at `apps/api/src/features/chatbot/embeddingProvider/types.ts` with `embed(texts: string[], options?: { signal?: AbortSignal }) => Promise<EmbeddingResult>` where `EmbeddingResult = { vectors: number[][]; inputTokens: number; model: string }`. `vectors` SHALL contain one 1024-dim vector per input in positional order; `model` SHALL be a non-empty string suitable for `chatbot_corpus_source.embedding_model`.

#### Scenario: Both implementations satisfy the same interface

- **WHEN** the TypeScript compiler type-checks `mock.ts` and `azureOpenAI.ts` against `EmbeddingProvider`
- **THEN** both modules SHALL export a value satisfying `EmbeddingProvider` and `pnpm type-check` SHALL pass

#### Scenario: Empty input array returns an empty result

- **WHEN** any provider is invoked with `embed([])`
- **THEN** the result SHALL have `vectors: []`, `inputTokens: 0`, and a non-empty `model` string

#### Scenario: Output vector count matches input string count

- **WHEN** any provider is invoked with `embed(texts)` where `texts.length = N`
- **THEN** `vectors` SHALL have length `N` in the same positional order as inputs

#### Scenario: Every returned vector has exactly 1024 dimensions

- **WHEN** any provider returns a non-empty `EmbeddingResult`
- **THEN** every entry in `vectors` SHALL have `length === 1024` exactly — neither shorter nor longer; this invariant holds for both `mock` and `azureOpenAI` and is asserted in unit tests so regressions surface before reaching the database (`vector(1024)` column would otherwise reject inserts at write time)

### Requirement: System provides a deterministic mock embedding implementation

The `mock` at `apps/api/src/features/chatbot/embeddingProvider/mock.ts` SHALL produce 1024-dim vectors deterministically derived from each input via SHA-256, then **L2-normalized to unit length** (`sum(v[i]^2) === 1.0` within floating-point precision). `inputTokens` uses the shared `estimateTokens` from `apps/api/src/features/chatbot/llmProvider/estimateTokens.ts`. `model` SHALL be the literal `"mock-sha256-1024"`. SHALL NOT make network calls.

The expansion algorithm: hash the input string with SHA-256 (32 bytes = 256 bits) and expand into 1024 float32 values via repeated re-hashing of the digest concatenated with a counter. After expansion, divide every component by the L2 norm so the resulting vector lives on the unit sphere. A zero-norm fallback is unreachable in practice (SHA-256 of any non-empty input is never all-zero) but if encountered SHALL leave the vector unchanged rather than divide by zero.

#### Scenario: Mock determinism across calls

- **WHEN** the mock provider is invoked twice with the same input string `"hola mundo"`
- **THEN** both invocations SHALL return vectors that are byte-equal element-by-element

#### Scenario: Mock distinct inputs produce distinct vectors

- **WHEN** the mock provider is invoked with two distinct input strings `"alcance 1"` and `"alcance 2"`
- **THEN** the two returned vectors SHALL differ in at least one element

#### Scenario: Mock model identifier

- **WHEN** the mock provider is invoked with any non-empty input array
- **THEN** the returned `model` field SHALL be exactly `"mock-sha256-1024"`

#### Scenario: Mock token counts use the shared helper

- **WHEN** the mock provider is invoked with input `["hola", "mundo"]`
- **THEN** `inputTokens` SHALL equal `estimateTokens("hola") + estimateTokens("mundo")` using the shared helper

#### Scenario: Mock vectors are L2-normalized

- **WHEN** the mock provider returns a vector for any non-empty input
- **THEN** the sum of the squared components SHALL equal `1.0` within a floating-point tolerance of `1e-6` — i.e., `Math.abs(v.reduce((acc, x) => acc + x*x, 0) - 1) < 1e-6`

#### Scenario: ESLint rule extends scope to mock embedding provider

- **WHEN** ESLint runs on `apps/api/src/features/chatbot/embeddingProvider/mock.ts`
- **THEN** `chatbot/no-network-imports-in-mock` SHALL fail with severity `error` if any of `openai`, `node:https`, `node:fetch`, `https`, `node-fetch`, `axios` is imported

### Requirement: System provides an azureOpenAI embedding implementation

The `azureOpenAI` at `apps/api/src/features/chatbot/embeddingProvider/azureOpenAI.ts` SHALL use the `openai` package's `AzureOpenAI` client against `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME`. Pass `dimensions: 1024`. `EmbeddingResult.model` SHALL be the deployment name. SHALL pass `options.signal` and SHALL batch internally subject to BOTH of the following per-request bounds:

1. **Token bound (Azure hard ceiling)**: 8192 tokens per SDK call. The implementation SHALL use an internal threshold of `7782` (= `Math.floor(8192 * 0.95)`, a 5% safety margin) when evaluating whether to start a new batch — see the "Embedding batcher applies a safety margin" requirement below for the foundation-driven rationale. The 8192 figure remains the documented Azure boundary; 7782 is the runtime threshold that absorbs `estimateTokens` drift on Spanish diacritics.
2. **Array-length bound**: `texts.length` per SDK call SHALL be ≤ 16.

A new batch SHALL start as soon as either bound would otherwise be violated. Both bounds are hard limits enforced by Azure (HTTP 400 on violation); the array-length cap is enforced strictly regardless of token totals, so a batch of 17 short strings totalling 50 tokens SHALL still be split into two SDK calls.

**Single-input overflow**: if any individual input has `estimateTokens(input) > 8192`, the provider SHALL throw before invoking the SDK. The thrown error's `name` SHALL be `"InputTooLargeError"` and its message SHALL name the offending input's index and its estimated token count. This pre-empts an unrecoverable Azure HTTP 400 (the model's hard per-input limit) and surfaces a clear failure to the caller — whether that caller is the ingest CLI (where it indicates a chunker bug, since chunks target ~600 tokens with hard ceiling well below 8192) or the search query path (where it indicates the upstream user-input cap let through an oversized query).

**Operational SDK errors**: network failures, timeouts, HTTP 429 (rate limit), HTTP 5xx (service errors), and quota-exhaustion errors raised by the underlying `openai` package SHALL propagate as-is from `embed()` without wrapping or translation. Consumers (ingest CLI, retrieval path) SHALL handle the SDK's own error types directly — distinguishing transient (retry-eligible) from permanent failures by inspecting the SDK error's `status` / `code`. The provider SHALL NOT swallow, log-and-rethrow, or rebrand these errors; the only errors authored by the provider itself are `InputTooLargeError` (validation) and abort-related errors when `options.signal` aborts.

#### Scenario: Module compiles against the openai SDK

- **WHEN** the TypeScript compiler type-checks `apps/api/src/features/chatbot/embeddingProvider/azureOpenAI.ts`
- **THEN** the project SHALL type-check successfully with `openai` and `@azure/identity` resolved as installed dependencies

#### Scenario: Implementation passes dimensions to the SDK

- **WHEN** the `azureOpenAI` implementation invokes the underlying `openai` SDK embeddings call
- **THEN** the SDK call arguments SHALL include `dimensions: 1024`

#### Scenario: Model field reflects the deployment name

- **WHEN** the `azureOpenAI` implementation completes a call against deployment `"text-embedding-3-large-prod"`
- **THEN** `EmbeddingResult.model` SHALL be exactly `"text-embedding-3-large-prod"`

#### Scenario: Implementation honors abort signals

- **WHEN** the `azureOpenAI` implementation is invoked with an `AbortSignal` that aborts during the SDK call
- **THEN** the underlying SDK call SHALL receive the same signal and the returned promise SHALL reject with an abort-related error

#### Scenario: Tests do not instantiate the Azure OpenAI client

- **WHEN** the test suite runs end-to-end
- **THEN** no test SHALL set `EMBEDDING_PROVIDER=azure-openai` and no test path SHALL instantiate `AzureOpenAI` for embeddings

#### Scenario: Batch splits when token sum would exceed the 7782 internal threshold

- **WHEN** the implementation is invoked with a `texts` array whose cumulative `estimateTokens` is 16000 across 10 inputs
- **THEN** the implementation SHALL split into ≥ 2 SDK calls so that no single call's cumulative `estimateTokens` exceeds 7782 (the 5% safety margin under Azure's 8192 hard ceiling)

#### Scenario: Batch splits when array length would exceed 16

- **WHEN** the implementation is invoked with a `texts` array of length 17, where each input is short enough that the cumulative token count is well below 8192
- **THEN** the implementation SHALL split into ≥ 2 SDK calls so that no single SDK call's `input` array exceeds length 16

#### Scenario: Both bounds enforced together

- **WHEN** the implementation is invoked with a `texts` array of length 32 whose cumulative `estimateTokens` is 9000
- **THEN** the implementation SHALL split into ≥ 3 SDK calls — at least 2 to satisfy the array-length cap, plus an additional split if the 16-input groups cross the token cap

#### Scenario: Single input exceeding the per-input token bound is rejected before SDK call

- **WHEN** the implementation is invoked with `texts = [shortInput, oversizedInput]` where `estimateTokens(oversizedInput) > 8192`
- **THEN** the provider SHALL throw an error with `error.name === "InputTooLargeError"` whose message names the offending input's index (1) and its estimated token count, and SHALL NOT invoke the underlying SDK at all (no embeddings call recorded by a stub SDK spy)

#### Scenario: Operational SDK errors propagate without wrapping

- **WHEN** the underlying `openai` SDK rejects with a network error, HTTP 429 (rate limit), HTTP 5xx, or quota-exhaustion error
- **THEN** the promise returned by `embed()` SHALL reject with the SDK's original error object — same constructor, same `status` / `code` / `cause` fields — without re-wrapping, re-throwing as a different class, or stripping metadata; consumers SHALL be able to distinguish transient vs permanent failures by inspecting that original error

### Requirement: Embedding batcher applies a safety margin to absorb estimateTokens drift

The `azureOpenAI` embedding provider's batcher SHALL apply an internal **safety margin of 5%** when evaluating the per-request token bound — i.e., it SHALL start a new batch as soon as `cumulative_estimateTokens > 7782` (= `Math.floor(8192 * 0.95)`), even though Azure's hard limit is 8192. The 5% margin absorbs the worst observed drift between `Math.ceil(text.length / 4)` and `cl100k_base` on Spanish technical prose. The 8192 number remains the documented Azure hard ceiling; 7782 is an implementation-internal threshold and SHALL NOT leak into wire contracts, error messages, or other specs.

> **Foundation constraint that motivates this**: the shared `estimateTokens` helper is fixed by foundation's `chatbot-llm-provider` spec at `Math.ceil(text.length / 4)` with a byte-for-byte assertion (`estimateTokens("hola mundo") === 3`). This change CANNOT alter that formula without modifying the foundation contract. For Spanish text with diacritics, that formula can mildly UNDERestimate against `cl100k_base` (real tokenization sometimes runs 3.0–3.5 chars/token on accented prose, vs. the heuristic's 4.0). To prevent rare HTTP 400 from Azure on legitimate batches, this change handles the drift in the BATCHER, not the helper.

The array-length cap (≤ 16) is unaffected by this margin — it is a pure count, not a token-derived value, and Azure enforces it byte-for-byte.

If telemetry or operational logs ever surface an Azure HTTP 400 for token-count violation, the runbook trigger is to (a) inspect the offending input, (b) consider tightening the margin further (e.g., 10%) or (c) escalate to swap the heuristic for a real `cl100k_base` tokenizer (`js-tiktoken`) — but doing so requires a parallel change that modifies the foundation `estimateTokens` contract, which is out of scope here.

#### Scenario: Batcher uses 7782 as the internal token threshold

- **WHEN** the implementation source for the azureOpenAI embedding batcher is inspected
- **THEN** the per-batch token threshold used to trigger a split SHALL be `7782` (or a named constant equal to `Math.floor(8192 * 0.95)`) — NOT `8192`. The 8192 figure remains in the spec as the documented Azure hard ceiling but SHALL NOT appear as the runtime threshold in the batching code

#### Scenario: Bounded batches never trigger HTTP 400 at the SDK boundary

- **WHEN** the embedding provider has split a request into batches per the documented dual bound (using `estimateTokens` against the 7782-token internal threshold AND the ≤16-input cap)
- **THEN** no resulting SDK call SHALL receive an HTTP 400 from Azure due to per-request token-count or array-length violations on representative Spanish technical prose

#### Scenario: Single oversized input check uses the documented 8192 ceiling, not the 7782 margin

- **WHEN** the batcher evaluates a single input for the per-input rejection rule (`InputTooLargeError`)
- **THEN** the threshold SHALL be `8192` exactly, NOT `7782` — the per-input limit is Azure's hard ceiling on individual inputs and the safety margin only applies to batch-cumulative totals

### Requirement: azureOpenAI embedding provider supports API key fallback

The provider SHALL inspect `AZURE_OPENAI_API_KEY` at construction. If set to a non-empty trimmed string, authenticate via API key. Otherwise fall back to `DefaultAzureCredential`. Production deployments leave the variable unset.

#### Scenario: API key path used when AZURE_OPENAI_API_KEY is set

- **WHEN** the API boots with `EMBEDDING_PROVIDER=azure-openai` and `AZURE_OPENAI_API_KEY` set to a non-empty trimmed string
- **THEN** the constructed client SHALL use API key authentication and SHALL NOT instantiate `DefaultAzureCredential`

#### Scenario: Managed identity path used when AZURE_OPENAI_API_KEY is unset

- **WHEN** the API boots with `EMBEDDING_PROVIDER=azure-openai` and `AZURE_OPENAI_API_KEY` unset (or empty/whitespace-only)
- **THEN** the constructed client SHALL use managed-identity via `DefaultAzureCredential` plus a bearer token provider against `https://cognitiveservices.azure.com/.default`

### Requirement: Embedding provider is selected at boot via EMBEDDING_PROVIDER

`getEmbeddingProvider()` selects the implementation from `EMBEDDING_PROVIDER`, parsed in `apps/api/src/config/environment.ts` with the same whitelist + IIFE-throw pattern as `LLM_PROVIDER`. Allowed: `"mock"`, `"azure-openai"`. Other values SHALL throw at startup. The factory SHALL cache the instance.

#### Scenario: mock selects the mock implementation

- **WHEN** the API starts with `EMBEDDING_PROVIDER=mock` and `NODE_ENV` is not `production`
- **THEN** `getEmbeddingProvider()` SHALL return the mock implementation

#### Scenario: azure-openai selects the Azure implementation

- **WHEN** the API starts with `EMBEDDING_PROVIDER=azure-openai` and `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` set
- **THEN** `getEmbeddingProvider()` SHALL return the `azureOpenAI` implementation

#### Scenario: Invalid value throws at boot

- **WHEN** the API starts with `EMBEDDING_PROVIDER=banana`
- **THEN** the process SHALL throw an `Error` listing allowed values and the invalid value, and the API SHALL NOT begin accepting requests

#### Scenario: Factory caches the provider instance

- **WHEN** `getEmbeddingProvider()` is invoked multiple times in the same process
- **THEN** every invocation SHALL return the same JavaScript object reference

### Requirement: System refuses to boot with EMBEDDING_PROVIDER=mock in production

When `NODE_ENV=production` AND `EMBEDDING_PROVIDER=mock`, boot validation SHALL throw and the API SHALL NOT begin accepting requests.

#### Scenario: Mock-in-prod boot throws

- **WHEN** the API starts with `NODE_ENV=production` AND `EMBEDDING_PROVIDER=mock`
- **THEN** the process SHALL throw an `Error` indicating `mock` is not allowed in production for embeddings, and the API SHALL NOT begin accepting requests

#### Scenario: Mock-in-non-prod is allowed

- **WHEN** the API starts with `NODE_ENV` set to `development`, `test`, or unset, AND `EMBEDDING_PROVIDER=mock`
- **THEN** the API SHALL boot normally and `getEmbeddingProvider()` SHALL return the mock

### Requirement: Boot-time guard requires Azure embedding deployment when EMBEDDING_PROVIDER=azure-openai

When `EMBEDDING_PROVIDER=azure-openai`, boot SHALL require `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` (non-empty trimmed) and `AZURE_OPENAI_ENDPOINT`. Optional `AZURE_OPENAI_EMBEDDING_API_VERSION`, when set, is passed to the SDK; when unset, falls back to `AZURE_OPENAI_API_VERSION`.

#### Scenario: Missing deployment name throws at boot

- **WHEN** the API starts with `EMBEDDING_PROVIDER=azure-openai` AND `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` unset
- **THEN** the process SHALL throw an `Error` naming the missing variable, and the API SHALL NOT begin accepting requests

#### Scenario: Embedding API version falls back to chat API version when unset

- **WHEN** the API starts with `EMBEDDING_PROVIDER=azure-openai`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` set, `AZURE_OPENAI_EMBEDDING_API_VERSION` unset, and `AZURE_OPENAI_API_VERSION=2024-10-21`
- **THEN** the embedding client SHALL use API version `"2024-10-21"`

#### Scenario: Embedding API version override

- **WHEN** the API starts with `AZURE_OPENAI_API_VERSION=2024-10-21` AND `AZURE_OPENAI_EMBEDDING_API_VERSION=2025-01-01-preview`
- **THEN** the embedding client SHALL use `"2025-01-01-preview"` and the chat client SHALL use `"2024-10-21"`

### Requirement: Provider implementations honor abort signals

Both `mock` and `azureOpenAI` SHALL accept `AbortSignal` via `options.signal` and terminate promptly when it aborts. The mock checks `signal.aborted` between batched computations; Azure passes the signal through to the SDK call.

#### Scenario: Mock provider terminates on abort

- **WHEN** the mock provider is invoked with input array of length ≥ 100 and an `AbortSignal` that aborts before computation completes
- **THEN** the returned promise SHALL reject and the rejection SHALL be observable as an abort condition

#### Scenario: Azure provider passes the signal upstream

- **WHEN** the `azureOpenAI` implementation is invoked with an `AbortSignal`
- **THEN** the underlying `openai` SDK embeddings call SHALL receive the same signal so aborting the consumer cancels the upstream request
