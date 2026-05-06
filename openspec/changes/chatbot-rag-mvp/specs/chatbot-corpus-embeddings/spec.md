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

### Requirement: System provides a deterministic mock embedding implementation

The `mock` at `apps/api/src/features/chatbot/embeddingProvider/mock.ts` SHALL produce 1024-dim vectors deterministically derived from each input via SHA-256, normalized to unit length. `inputTokens` uses the shared `estimateTokens` from `apps/api/src/features/chatbot/llmProvider/estimateTokens.ts`. `model` SHALL be the literal `"mock-sha256-1024"`. SHALL NOT make network calls.

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

#### Scenario: ESLint rule extends scope to mock embedding provider

- **WHEN** ESLint runs on `apps/api/src/features/chatbot/embeddingProvider/mock.ts`
- **THEN** `chatbot/no-network-imports-in-mock` SHALL fail with severity `error` if any of `openai`, `node:https`, `node:fetch`, `https`, `node-fetch`, `axios` is imported

### Requirement: System provides an azureOpenAI embedding implementation

The `azureOpenAI` at `apps/api/src/features/chatbot/embeddingProvider/azureOpenAI.ts` SHALL use the `openai` package's `AzureOpenAI` client against `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME`. Pass `dimensions: 1024`. `EmbeddingResult.model` SHALL be the deployment name. SHALL pass `options.signal` and SHALL batch internally subject to BOTH of the following per-request bounds:

1. **Token bound**: the sum of `estimateTokens` over the batch's inputs SHALL be ≤ 8192 tokens.
2. **Array-length bound**: `texts.length` per SDK call SHALL be ≤ 16.

A new batch SHALL start as soon as either bound would otherwise be violated. Both bounds are hard limits enforced by Azure (HTTP 400 on violation); the array-length cap is enforced strictly regardless of token totals, so a batch of 17 short strings totalling 50 tokens SHALL still be split into two SDK calls.

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

#### Scenario: Batch splits when token sum would exceed 8192

- **WHEN** the implementation is invoked with a `texts` array whose cumulative `estimateTokens` is 16000 across 10 inputs
- **THEN** the implementation SHALL split into ≥ 2 SDK calls so that no single call's input sum exceeds 8192 tokens

#### Scenario: Batch splits when array length would exceed 16

- **WHEN** the implementation is invoked with a `texts` array of length 17, where each input is short enough that the cumulative token count is well below 8192
- **THEN** the implementation SHALL split into ≥ 2 SDK calls so that no single SDK call's `input` array exceeds length 16

#### Scenario: Both bounds enforced together

- **WHEN** the implementation is invoked with a `texts` array of length 32 whose cumulative `estimateTokens` is 9000
- **THEN** the implementation SHALL split into ≥ 3 SDK calls — at least 2 to satisfy the array-length cap, plus an additional split if the 16-input groups cross the token cap

### Requirement: estimateTokens helper is compatible with the embedding model's tokenizer

The shared `estimateTokens` helper used to size embedding batches and to enforce ingest chunking targets SHALL use a tokenizer compatible with `text-embedding-3-large` (i.e., `cl100k_base`-equivalent or newer compatible encoding) — OR a heuristic that consistently OVERestimates rather than underestimates. An UNDERestimate causes Azure to reject the SDK call with HTTP 400 at runtime, defeating the purpose of pre-flight bounding. The same helper is shared with the chunking heuristic in `chatbot-corpus-ingest`; both rely on the OVERestimation property to keep their respective bounds safe.

#### Scenario: Tokenizer never underestimates against the model's count

- **WHEN** `estimateTokens(text)` is invoked for any non-empty input that the SDK is asked to embed
- **THEN** the helper's returned count SHALL be ≥ the model's actual tokenization for that input, OR equal under a `cl100k_base`-compatible encoding — never strictly less

#### Scenario: Bounded batches never trigger HTTP 400 at the SDK boundary

- **WHEN** the embedding provider has split a request into batches per the documented dual bound (≤8192 tokens AND ≤16 inputs per call) using `estimateTokens`
- **THEN** no resulting SDK call SHALL receive an HTTP 400 from Azure due to per-request token-count or array-length violations

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
