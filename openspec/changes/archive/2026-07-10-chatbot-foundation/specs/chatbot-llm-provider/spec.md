## ADDED Requirements

### Requirement: System exposes an `LLMProvider` interface

The system SHALL define an `LLMProvider` TypeScript interface with a single async method `streamCompletion(messages, options)`. The method SHALL accept an array of typed messages of the shape `{ role: ChatMessageRole; content: string }[]` and an `options` object including at minimum `maxOutputTokens: number` and an optional `signal: AbortSignal`. The method SHALL return an async iterable that yields token chunks (`{ type: "delta", content: string }`) terminated by a final usage event (`{ type: "usage", inputTokens: number, outputTokens: number }`). The interface SHALL live under `apps/api/src/features/chatbot/llmProvider/types.ts`.

#### Scenario: Both implementations satisfy the same interface

- **WHEN** the TypeScript compiler type-checks `mock.ts` and `azureOpenAI.ts` against the `LLMProvider` interface
- **THEN** both modules SHALL export a value satisfying `LLMProvider` and the project SHALL type-check with `pnpm type-check`

### Requirement: Shared `estimateTokens(text)` helper is the single source of truth for token estimation

The system SHALL provide a shared `estimateTokens(text: string): number` helper at `apps/api/src/features/chatbot/llmProvider/estimateTokens.ts` whose body is `return Math.ceil(text.length / 4);`. Every code path in the chatbot foundation that needs to estimate the token count of a string — token-cap enforcement in the streaming handler, the mock provider's `usage` reporting, and any other consumer — SHALL call this helper. No other module in this change SHALL implement an inline token-count formula.

#### Scenario: Helper returns the documented formula

- **WHEN** `estimateTokens("hola mundo")` is called
- **THEN** it SHALL return `3` (= `Math.ceil(10 / 4)`)

#### Scenario: ESLint rule enforces single source for estimateTokens formula

- **WHEN** ESLint runs on `apps/api/src/features/chatbot/`
- **THEN** the custom rule `chatbot/single-source-estimate-tokens` (declared inline in `apps/api/eslint.config.ts`) SHALL fail with severity `error` if any file other than `apps/api/src/features/chatbot/llmProvider/estimateTokens.ts` contains the AST pattern equivalent to `Math.ceil(<expression>.length / 4)`

#### Scenario: Empty string returns zero

- **WHEN** `estimateTokens("")` is called
- **THEN** it SHALL return `0`

### Requirement: System provides a deterministic mock implementation

The system SHALL provide a `mock` implementation of `LLMProvider` that yields a deterministic eco template `"Recibí: {user_message}. Esta es una respuesta de mock."`, where `{user_message}` is the content of the most recent `USER`-role message in the input. The output SHALL be split into multiple `delta` chunks (split on word boundaries with at least three chunks per response) so that streaming behavior can be exercised. The mock SHALL emit a final `usage` event whose `inputTokens` is computed by calling `estimateTokens(joined_input_text)` and whose `outputTokens` is computed by calling `estimateTokens(output_text)` — both using the shared helper defined above. The mock SHALL NOT make any network calls.

#### Scenario: Mock yields chunked deterministic response

- **WHEN** the mock provider is invoked with `messages = [{ role: USER, content: "hola" }]`
- **THEN** the iterable SHALL yield at least three `delta` events whose concatenated content equals `"Recibí: hola. Esta es una respuesta de mock."`, followed by exactly one `usage` event

#### Scenario: Mock token counts use the shared helper

- **WHEN** the mock provider is invoked
- **THEN** the final `usage.inputTokens` SHALL equal `estimateTokens(joined_input_text)` and `usage.outputTokens` SHALL equal `estimateTokens(output_text)`, where `estimateTokens` is the shared helper defined in this capability

#### Scenario: ESLint rule enforces no network imports in mock provider

- **WHEN** ESLint runs on `apps/api/src/features/chatbot/llmProvider/mock.ts`
- **THEN** the custom rule `chatbot/no-network-imports-in-mock` (declared inline in `apps/api/eslint.config.ts`) SHALL fail with severity `error` if any of the modules `openai`, `node:https`, `node:fetch`, `https`, `node-fetch`, or `axios` is imported, directly or transitively via re-exports inside the file

### Requirement: System provides an `azureOpenAI` implementation

The system SHALL provide an `azureOpenAI` implementation of `LLMProvider` at `apps/api/src/features/chatbot/llmProvider/azureOpenAI.ts`. It SHALL use the `openai` npm package's `AzureOpenAI` client configured with `DefaultAzureCredential` from `@azure/identity` (managed-identity authentication, no API keys). The implementation SHALL stream chat completions and translate the upstream chunks into the `LLMProvider` event shape. This implementation is fully written but SHALL NOT be exercised by the test suite in this change.

#### Scenario: Module compiles against the openai SDK

- **WHEN** the TypeScript compiler type-checks `azureOpenAI.ts`
- **THEN** the project SHALL type-check successfully with `openai` and `@azure/identity` resolved as installed dependencies

#### Scenario: Tests do not instantiate the Azure OpenAI client

- **WHEN** the test suite runs end-to-end
- **THEN** no test SHALL set `LLM_PROVIDER=azure-openai` and no test path SHALL instantiate the `AzureOpenAI` client

### Requirement: Provider is selected at boot via `LLM_PROVIDER`

A factory `getLlmProvider()` SHALL select the `LLMProvider` implementation based on the `LLM_PROVIDER` environment variable. The variable SHALL be parsed in `apps/api/src/config/environment.ts` using the same whitelist + IIFE-throw pattern used by `AUTH_PROVIDER`. Allowed values SHALL be `"mock"` and `"azure-openai"`. Any other value SHALL cause the process to throw at startup with a descriptive error. The factory SHALL be evaluated at boot, not lazily per request.

#### Scenario: `mock` selects the mock implementation

- **WHEN** the API starts with `LLM_PROVIDER=mock` and `NODE_ENV` is not `production`
- **THEN** `getLlmProvider()` SHALL return the mock implementation

#### Scenario: `azure-openai` selects the Azure implementation

- **WHEN** the API starts with `LLM_PROVIDER=azure-openai`
- **THEN** `getLlmProvider()` SHALL return the `azureOpenAI` implementation

#### Scenario: Invalid value throws at boot

- **WHEN** the API starts with `LLM_PROVIDER=banana`
- **THEN** the process SHALL throw an `Error` whose message lists the allowed values and the invalid value, and the API SHALL NOT begin accepting requests

### Requirement: System refuses to boot with `LLM_PROVIDER=mock` in production

When `NODE_ENV=production` AND `LLM_PROVIDER=mock`, the boot validation SHALL throw with a descriptive error and the API SHALL NOT begin accepting requests. This guard prevents a mock provider from leaking into user traffic.

#### Scenario: Mock-in-prod boot throws

- **WHEN** the API starts with `NODE_ENV=production` AND `LLM_PROVIDER=mock`
- **THEN** the process SHALL throw an `Error` indicating that `mock` is not allowed in production, and the API SHALL NOT begin accepting requests

#### Scenario: Mock-in-non-prod is allowed

- **WHEN** the API starts with `NODE_ENV` set to `development`, `test`, or unset, AND `LLM_PROVIDER=mock`
- **THEN** the API SHALL boot normally and `getLlmProvider()` SHALL return the mock implementation

### Requirement: Token caps are defined as named constants in API config

The system SHALL define the following token cap constants in `apps/api/src/config/constants.ts` with the exact values listed:

- `CHATBOT_MAX_USER_INPUT_TOKENS = 4000`
- `CHATBOT_MAX_HISTORY_TOKENS = 8000`
- `CHATBOT_MAX_RAG_CONTEXT_TOKENS = 12000` (declared now, unused until V1)
- `CHATBOT_MAX_OUTPUT_TOKENS = 1500`
- `CHATBOT_MAX_TURNS_PER_CONVERSATION = 50`
- `CHATBOT_CONVERSATION_TTL_DAYS = 30`

The streaming handler in `chatbot-message-streaming` consumes the input, history, output, and turn caps; `CHATBOT_MAX_RAG_CONTEXT_TOKENS` ships ahead of V1 to lock the constant location.

#### Scenario: Constants exist with the documented values

- **WHEN** `apps/api/src/config/constants.ts` is inspected
- **THEN** the six constants above SHALL be exported with the exact numeric values listed

### Requirement: Provider implementations honor abort signals

Both `mock` and `azureOpenAI` implementations of `streamCompletion` SHALL accept an `AbortSignal` via `options.signal` and SHALL terminate the iterable promptly when the signal aborts. This lets the streaming handler propagate client disconnects up to the provider so upstream resources are released.

#### Scenario: Mock provider stops iterating on abort

- **WHEN** the mock provider is invoked with an `AbortSignal` that aborts before all chunks are consumed
- **THEN** the iterable SHALL stop yielding events and the consumer SHALL observe the abort condition (e.g., via `signal.aborted` or via the iterable raising an `AbortError`)

#### Scenario: Azure implementation passes the signal upstream

- **WHEN** the `azureOpenAI` implementation is invoked with an `AbortSignal`
- **THEN** the underlying `openai` SDK call SHALL receive the same signal, so aborting the consumer cancels the upstream request
