# Chatbot LLM providers

The chatbot talks to its language model through **one interface**, so the cloud
LLM is a swappable, per-deployment choice (DPG cloud-agnosticism). Nothing in
the SSE handler, identity model, persistence layer, timeouts, or degraded logic
is vendor-specific — they all consume `LLMProvider`, never a vendor SDK.

Two providers ship today: `mock` (deterministic, offline — used by every test)
and `azure-openai`. This doc is the checklist for adding a third (OpenAI,
Anthropic, a local model, …). See `design.md` Decision 4 for the rationale.

## The contract

`types.ts`:

```ts
interface LLMProvider {
  streamCompletion(
    messages: LlmMessage[], // { role: ChatMessageRole; content: string }[]
    options: LlmStreamOptions // { maxOutputTokens: number; signal?: AbortSignal }
  ): AsyncIterable<LlmStreamEvent>; // { type: "delta"; content } | { type: "usage"; inputTokens; outputTokens }
}
```

A provider is an `async *streamCompletion` generator that:

- **yields `{ type: "delta", content }`** for each token chunk as it arrives;
- **yields `{ type: "usage", inputTokens, outputTokens }` once** at the end
  (optional but strongly recommended — the handler persists it; when omitted it
  records `0`). If the vendor doesn't return token counts, fall back to
  `estimateTokens(...)` from `./estimateTokens.js` (see caveats);
- **honors `options.signal`** — stop/return when it aborts. The handler relies
  on this for client disconnects, the user Stop control, and the client/server
  timeouts. `azureOpenAI.ts` also runs its own overall + idle timeout
  (`CHATBOT_LLM_STREAM_TIMEOUT_MS` / `CHATBOT_LLM_STREAM_IDLE_TIMEOUT_MS`) so a
  stalled upstream fails fast — do the same for any networked provider;
- **passes `options.maxOutputTokens`** to the vendor as the output cap.

Errors surface as a terminal SSE `error` event mid-stream, not a pre-stream HTTP
status: the generator body runs lazily inside the handler's `for await`, so
throwing from `streamCompletion` at call time is not possible. Just `throw` (or
let the vendor SDK throw) from inside the loop; the handler catches it, finalizes
the row, and the widget shows the error/degraded UI.

## Steps to add a provider `foo`

1. **Implement it** — `foo.ts` exporting `fooProvider: LLMProvider`. Map the
   vendor's streaming API onto the delta/usage events above. Handle role
   mapping: the interface passes a flat `LlmMessage[]` with `USER` / `ASSISTANT`
   / `SYSTEM` / `TOOL` roles; vendors differ (e.g. Anthropic separates the
   `system` prompt from the turn list and requires alternating user/assistant),
   so translate in the provider — `azureOpenAI.ts` coerces `TOOL` → user as a
   reference.
2. **Register it** — `index.ts`, extend `getLlmProvider()` to return
   `fooProvider` when `LLM_PROVIDER === "foo"`. The provider is built lazily and
   cached on first request (and only when the chatbot is enabled), so an
   unselected provider's client is never constructed.
3. **Whitelist + validate config** — `@/config/environment.ts`: add `"foo"` to
   `LlmProviderType` and the `valid` array, and add any provider-specific env
   (API key, model) as exported constants. Gate required-config boot checks on
   `CHATBOT_ENABLED` **and** `LLM_PROVIDER === "foo"`, mirroring the
   `azure-openai` IIFE, so a chatbot-disabled deployment needs none of it.
4. **Declare env for Turbo** — add each new var (e.g. `FOO_API_KEY`,
   `FOO_MODEL`) to `globalEnv` in `turbo.json`, or the `turbo/no-undeclared-env-vars`
   lint fails.
5. **Document + template the env** — add the vars to the chatbot table in
   `docs/development/environment-variables.md` and to the env examples
   (`.env.dockercompose.example`, `.env.prod.dockercompose.example`,
   `.envrc.template`, `.envrc.azure.example`).
6. **Tests** — the integration suite runs on `mock` and needs no change. Add a
   provider unit test if useful (mirror `test/features/chatbot/llmProvider/unit.test.ts`);
   don't wire the real vendor into the integration suite.

## Caveats (enforced)

- **`mock` must stay offline.** The `chatbot/no-network-imports-in-mock` ESLint
  rule forbids network imports in `mock.ts`. Real providers may import their SDK
  freely — this rule only guards the mock.
- **Don't inline the token formula.** `chatbot/single-source-estimate-tokens`
  requires the `4 chars/token` heuristic to live only in `estimateTokens.ts`.
  Import `estimateTokens` for any usage fallback.
- **`mock` is refused in production.** The boot guard throws when
  `LLM_PROVIDER=mock` **and** `NODE_ENV=production` **and** `CHATBOT_ENABLED=true`
  — so a real deployment can't accidentally serve the mock.
