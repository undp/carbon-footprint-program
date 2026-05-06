## ADDED Requirements

### Requirement: ESLint rule chatbot/no-network-imports-in-mock applies to both LLM and embedding mocks

The custom rule `chatbot/no-network-imports-in-mock` in `apps/api/eslint.config.ts` SHALL apply to both `apps/api/src/features/chatbot/llmProvider/mock.ts` (existing) and `apps/api/src/features/chatbot/embeddingProvider/mock.ts` (added). Rule body and forbidden-imports set unchanged from foundation; only the file scope extends. One rule, two file targets — NOT two parallel rules.

#### Scenario: Rule is configured against both mock files

- **WHEN** `apps/api/eslint.config.ts` is inspected
- **THEN** there SHALL be exactly one `files: [...]` block applying `chatbot/no-network-imports-in-mock` whose `files` array includes both `apps/api/src/features/chatbot/llmProvider/mock.ts` AND `apps/api/src/features/chatbot/embeddingProvider/mock.ts`; the rule SHALL NOT be duplicated

#### Scenario: Rule fails when LLM mock imports a network module

- **WHEN** ESLint runs on `apps/api/src/features/chatbot/llmProvider/mock.ts` containing `import "openai"`
- **THEN** the rule SHALL emit an `error`-severity diagnostic naming the forbidden module

#### Scenario: Rule fails when embedding mock imports a network module

- **WHEN** ESLint runs on `apps/api/src/features/chatbot/embeddingProvider/mock.ts` containing `import "node-fetch"`
- **THEN** the rule SHALL emit an `error`-severity diagnostic naming the forbidden module

### Requirement: Azure OpenAI API version is configurable via env var

The Azure chat provider's API version SHALL be configurable via `AZURE_OPENAI_API_VERSION` (default `"2024-10-21"`), parsed in `apps/api/src/config/environment.ts`. The chat client receives this as `apiVersion`; the previously-hardcoded constant in `azureOpenAI.ts` is removed.

#### Scenario: Default API version when env var unset

- **WHEN** the API boots with `LLM_PROVIDER=azure-openai` and `AZURE_OPENAI_API_VERSION` unset
- **THEN** the constructed chat client SHALL use API version `"2024-10-21"`

#### Scenario: Custom API version when env var set

- **WHEN** the API boots with `LLM_PROVIDER=azure-openai` and `AZURE_OPENAI_API_VERSION=2025-01-01-preview`
- **THEN** the constructed chat client SHALL use `"2025-01-01-preview"`

#### Scenario: Hardcoded constant is removed from azureOpenAI.ts

- **WHEN** `apps/api/src/features/chatbot/llmProvider/azureOpenAI.ts` is inspected
- **THEN** the file SHALL NOT contain a hardcoded `const AZURE_OPENAI_API_VERSION = "..."` declaration; the value SHALL be imported from `@/config/environment.js`

## MODIFIED Requirements

### Requirement: System exposes an LLMProvider interface

`LLMProvider` SHALL define `streamCompletion(messages, options)` accepting `LlmMessage[]` and `options` including `maxOutputTokens: number`, optional `signal?: AbortSignal`, and optional `tools?: LlmToolDefinition[]`. The method SHALL return an async iterable yielding `delta` (`{ type: "delta", content: string }`), `tool_call` (`{ type: "tool_call", id, name, arguments }` — at most once per stream when accumulated), and a final `usage` (`{ type: "usage", inputTokens, outputTokens }`).

`LlmMessage` is a discriminated union:

```ts
type LlmMessage =
  | { role: "USER" | "SYSTEM"; content: string }
  | { role: "ASSISTANT"; content: string; toolCalls?: LlmToolCall[] }
  | { role: "TOOL"; content: string; toolCallId: string };
type LlmToolCall = { id: string; name: string; arguments: string };
type LlmToolDefinition = { name: string; description: string; parameters: object };
```

`role` uses `ChatMessageRole` enum values. `role = "TOOL"` SHALL carry a non-empty `toolCallId` matching the `id` of an earlier `tool_call`. `tool_call` SHALL be the terminal event of its invocation. Interface lives at `apps/api/src/features/chatbot/llmProvider/types.ts`.

#### Scenario: Both implementations satisfy the extended interface

- **WHEN** the TypeScript compiler type-checks `mock.ts` and `azureOpenAI.ts` against the extended `LLMProvider`
- **THEN** both modules SHALL export a value satisfying `LLMProvider` (including the new `tool_call` event variant and `LlmMessage` discriminated union) and `pnpm type-check` SHALL pass

#### Scenario: Tool-call event terminates the stream

- **WHEN** any provider emits a `tool_call` event during `streamCompletion`
- **THEN** no further events SHALL be yielded; the iterable SHALL complete immediately after the `tool_call`

#### Scenario: TOOL message includes toolCallId matching a prior tool_call

- **WHEN** the handler invokes `streamCompletion` with messages including a `role = TOOL` entry
- **THEN** the entry's `toolCallId` SHALL be a non-empty string and SHALL match the `id` of a `tool_call` event emitted earlier in the same conversation thread

### Requirement: System provides a deterministic mock implementation

The `mock` SHALL yield the deterministic eco template `"Recibí: {user_message}. Esta es una respuesta de mock."` chunked into multiple `delta` events for ordinary messages. It emits a deterministic `tool_call` when the most recent user message matches (case-insensitive substring) any of `"alcance"`, `"alcances"`, `"protocolo"`, `"factor"`. When triggered: `name = "searchKnowledge"`, `arguments = JSON.stringify({ query: <last-user-content> })`. After the handler appends a `role = TOOL` and re-invokes, the mock yields the eco template (incorporating the tool result label) instead of issuing another `tool_call`. Final `usage` event uses `estimateTokens`. SHALL NOT make network calls.

#### Scenario: Mock yields tool_call when keyword present

- **WHEN** the mock is invoked with `messages = [{ role: USER, content: "explicame los alcances 1, 2 y 3" }]`
- **THEN** the iterable SHALL yield exactly one `tool_call` event with `name = "searchKnowledge"` and `arguments` equal to a JSON object containing the original user message verbatim, and the iterable SHALL complete after that event without yielding any `delta` or `usage`

#### Scenario: Mock yields normal eco template on second invocation after tool round

- **WHEN** the mock is invoked with messages that include a `role = TOOL` entry following a `role = ASSISTANT` entry with `toolCalls`
- **THEN** the iterable SHALL yield ≥3 `delta` events whose concatenated content matches the eco template incorporating the tool result, followed by exactly one terminal `usage`; SHALL NOT yield a second `tool_call`

#### Scenario: Mock yields normal eco template on non-keyword input

- **WHEN** the mock is invoked with `messages = [{ role: USER, content: "hola" }]`
- **THEN** the iterable SHALL yield ≥3 `delta` events plus one terminal `usage`, and SHALL NOT yield a `tool_call`

#### Scenario: Mock token counts use the shared helper

- **WHEN** the mock is invoked
- **THEN** `usage.inputTokens` SHALL equal `estimateTokens(joined_input_text)` and `usage.outputTokens` SHALL equal `estimateTokens(output_text)`, using `apps/api/src/features/chatbot/llmProvider/estimateTokens.ts`

### Requirement: System provides an azureOpenAI implementation

The `azureOpenAI` at `apps/api/src/features/chatbot/llmProvider/azureOpenAI.ts` SHALL use the `openai` package's `AzureOpenAI`. When `options.tools` is passed, forward to the SDK with `tool_choice: "auto"`. Translate upstream chunks: assistant content tokens → `delta`; tool-call deltas accumulated until `finish_reason === "tool_calls"`, then one `{ type: "tool_call", id, name, arguments }` and complete. `options.signal` passes through. `role = TOOL` translates to `{ role: "tool", content, tool_call_id }` — the foundation TOOL → user coercion is removed.

API key fallback: if `AZURE_OPENAI_API_KEY` is set to a non-empty trimmed string, use API key; else fall back to `DefaultAzureCredential`. Production leaves the var unset.

API version comes from `AZURE_OPENAI_API_VERSION` (default `"2024-10-21"`); previously-hardcoded constant removed.

#### Scenario: Module compiles against the openai SDK with tools support

- **WHEN** the TypeScript compiler type-checks `azureOpenAI.ts` after the V1 RAG MVP changes
- **THEN** the project SHALL type-check successfully with `openai` and `@azure/identity`, and the SDK call's `tools` argument type SHALL match the SDK's chat completions `tools` parameter type

#### Scenario: TOOL messages are forwarded with tool_call_id

- **WHEN** the implementation is invoked with `messages` including `{ role: "TOOL", content: "...", toolCallId: "call_abc" }`
- **THEN** the SDK call's `messages` argument SHALL include a corresponding entry with `role: "tool"`, `content: "..."`, `tool_call_id: "call_abc"`; the TOOL → user coercion SHALL NOT execute

#### Scenario: Tool-call deltas are accumulated and emitted as one event

- **WHEN** the SDK streams tool-call deltas across multiple chunks
- **THEN** the implementation SHALL accumulate `id`, `function.name`, `function.arguments` across chunks, and SHALL emit exactly one `{ type: "tool_call", id, name, arguments }` event when `finish_reason === "tool_calls"`, after which the iterable SHALL complete

#### Scenario: API key path used when AZURE_OPENAI_API_KEY is set

- **WHEN** the API boots with `LLM_PROVIDER=azure-openai` and `AZURE_OPENAI_API_KEY` set to a non-empty trimmed string
- **THEN** the constructed chat client SHALL use API key authentication and SHALL NOT instantiate `DefaultAzureCredential`

#### Scenario: Managed identity path used when AZURE_OPENAI_API_KEY is unset

- **WHEN** the API boots with `LLM_PROVIDER=azure-openai` and `AZURE_OPENAI_API_KEY` unset (or empty/whitespace-only)
- **THEN** the constructed chat client SHALL use managed-identity via `DefaultAzureCredential` plus a bearer token provider against `https://cognitiveservices.azure.com/.default`

#### Scenario: Tests do not instantiate the Azure OpenAI client

- **WHEN** the test suite runs end-to-end
- **THEN** no test SHALL set `LLM_PROVIDER=azure-openai` and no test path SHALL instantiate `AzureOpenAI` chat client
