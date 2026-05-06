## ADDED Requirements

### Requirement: System prompt is loaded at boot from prompts/es/system.md and prepended to every turn

The streaming handler SHALL prepend a `role = SYSTEM` message at the head of `messages` passed to `LLMProvider.streamCompletion`. Content loaded from `apps/api/src/features/chatbot/prompts/es/system.md` once at module load (cached). The file SHALL contain Spanish text covering:

1. **Identity (forward-compatible across phases)**: the bot SHALL identify as the **Huella Latam assistant**, not as an "educational" or scope-narrow agent. The literal opening line of the prompt SHALL be `"Eres el Asistente de Huella Latam, una plataforma para medir y reducir huella de carbono."` This identity is stable across V1 / V2 / V3 / V4 / V5 — when later phases land, only the per-phase capability disclosure (item 5 below) changes; the identity does not. Avoiding "educational" in the identity is intentional: the documented vision (`design.md` §Background and the public plan) frames the bot as a conversational assistant covering carbon-footprint methodology AND platform usage — locking V1 to "educational" would force a system-prompt rewrite when V2/V3 add measurement and platform-guide modes.

2. **Phase-aware capability disclosure**: a single line stating what the bot can do **today** (V1: educational questions about carbon-footprint methodology with verified citations) and acknowledging that platform-usage and measurement help are coming in later versions. Literal: `"En esta versión inicial puedo responder preguntas sobre metodología de huella de carbono citando fuentes verificadas. Las funcionalidades de medición asistida y guía de uso de la plataforma llegarán en próximas versiones."`

3. **Three-mode routing block** that classifies every incoming user message into one of three modes BEFORE deciding whether to invoke `searchKnowledge`:
   - **Modo A — Metodología** (preguntas sobre huella de carbono, alcances 1/2/3, factores de emisión, GHG Protocol, IPCC, ISO 14064, GWP, metodologías de cálculo): invocar `searchKnowledge` y seguir el flujo de citas / K=0 fallback.
   - **Modo B — Plataforma** (preguntas sobre el uso de la plataforma Huella Latam: cómo crear un inventario, cómo invitar usuarios, cómo solicitar verificación, navegación, configuración): NO invocar `searchKnowledge`. Responder con el redirect literal definido en el item 4 below.
   - **Modo C — Conversacional / orientación** (saludos, agradecimientos, meta-preguntas sobre el bot, preguntas claramente fuera de huella de carbono y plataforma): respuesta breve y natural sin invocar tool, sin opener técnico. **Sub-guidance para saludos y orientación**: cuando el usuario salude (`"hola"`, `"buenas"`, `"hi"`) o pregunte por las capacidades del asistente (`"¿qué puedes hacer?"`, `"¿en qué me ayudas?"`, `"ayuda"`, `"qué eres"`), la respuesta SHALL incluir, en una bienvenida breve y natural, los tres elementos siguientes — sin orden fijo y con redacción libre: (a) lo que el bot puede hacer hoy (responder preguntas sobre metodología de huella de carbono, alcances 1/2/3, factores de emisión, citando fuentes verificadas como GHG Protocol e IPCC); (b) la mención de que la guía sobre el uso de la plataforma y la medición asistida llegarán en próximas versiones; (c) una invitación a hacer una primera pregunta. La respuesta de orientación SHALL NOT empezar con el opener del Modo A ni contener el redirect literal del Modo B — su tono es de bienvenida, no de límite.

4. **Modo B redirect literal (load-bearing)**: when the bot classifies a turn as Modo B, the response SHALL be exactly the platform-redirect literal — to be confirmed by Nicolas (see open decision F5). Default applied here pending confirmation: `"Esa pregunta corresponde al uso de la plataforma Huella Latam. Esa funcionalidad estará disponible en una próxima versión del asistente; por ahora puedo ayudarte con preguntas sobre metodología de huella de carbono."` This phrase is asserted byte-for-byte by the platform-mode test (10.35).

5. **Mandatory-citation rule** for Modo A: every factual claim in a methodology answer SHALL be accompanied by an inline Markdown citation `[<cite_label>](<cite_url>)` derived from the chunks returned by `searchKnowledge`. The K=0 fallback wording (item 6) applies only when Modo A activated `searchKnowledge` and validated chunks came back empty — Modo B and Modo C have their own dedicated wordings and SHALL NOT use the K=0 opener.

6. A K=0 guardrail (Modo A only) with **a load-bearing opener** plus **soft guidance** on quantitative claims, present in the prompt verbatim:

   ```
   Si el resultado de la búsqueda indica '0 fuentes válidas encontradas', DEBES
   comenzar tu respuesta EXACTAMENTE con la frase "No dispongo de fuentes
   verificadas en mi corpus para responder esto con precisión." A continuación
   PUEDES sugerir al usuario consultar fuentes externas autorizadas (por
   ejemplo, el GHG Protocol Corporate Standard, las metodologías del IPCC, o
   un verificador certificado) y PUEDES incluir información complementaria
   (factores aproximados, cifras orientativas, contexto general del dominio)
   siempre que:

   - Califiques claramente la información como aproximada o referencial usando
     expresiones como "aproximadamente", "típicamente", "según fuentes
     públicas como [nombre]".
   - Recuerdes al usuario que cualquier valor que use en un inventario formal
     debe verificarse contra la fuente oficial.

   PROHIBIDO en este escenario: inventar URLs específicas, inventar números
   de sección (formato §X.Y), o inventar referencias bibliográficas. La
   apertura ya aclara que la respuesta no proviene del corpus verificado;
   no es necesario inventar trazabilidad falsa.
   ```

   The opener phrase is load-bearing — the K=0 fallback CRITICAL test asserts the assistant turn STARTS with that literal substring. The URL/citation invention prohibition is also load-bearing: the test asserts the assistant turn contains no Markdown link `[label](url)` and no `§X.Y` section reference in the K=0 path (those are reserved for citation-backed answers). The prompt SHALL NOT paraphrase the opener or weaken the URL/citation prohibition.

   Cifras, factores, y fechas SÍ pueden aparecer en este escenario cuando vengan calificadas como aproximadas o referenciales — esa es la postura industrial estándar (Claude, ChatGPT) y la protección viene de las dos capas: el opener literal + el disclaimer persistente del widget. Esta decisión está documentada en `design.md` Decision 14.

The prompt counts toward `CHATBOT_MAX_HISTORY_TOKENS`.

#### Scenario: System prompt is the first message in every request

- **WHEN** the streaming handler invokes `provider.streamCompletion(messages, options)`
- **THEN** `messages[0]` SHALL have `role = SYSTEM` and `content` equal to the contents of `apps/api/src/features/chatbot/prompts/es/system.md` at boot time

#### Scenario: Prompt file is read once and cached

- **WHEN** the streaming handler is invoked twice in the same process for two distinct turns
- **THEN** `fs.readFileSync` (or equivalent) SHALL have been invoked at most once on `prompts/es/system.md` since process start

#### Scenario: System prompt counts toward history token cap

- **WHEN** the cap-enforcement step runs and conversation history plus system prompt exceed `CHATBOT_MAX_HISTORY_TOKENS`
- **THEN** the response SHALL be HTTP 413 with code `REQUEST_TOO_LARGE` and SHALL NOT invoke the LLM provider

#### Scenario: Prompt file missing fails at boot

- **WHEN** the API boots and `apps/api/src/features/chatbot/prompts/es/system.md` does not exist or is empty
- **THEN** the process SHALL throw an `Error` naming the missing file, and the API SHALL NOT begin accepting requests

#### Scenario: Prompt contains the forward-compatible identity literal

- **WHEN** `apps/api/src/features/chatbot/prompts/es/system.md` is inspected
- **THEN** it SHALL contain the literal opening line `Eres el Asistente de Huella Latam, una plataforma para medir y reducir huella de carbono.` byte-for-byte. The identity SHALL NOT use the words "educativo" or "didáctico" as scope-narrowing modifiers — V2/V3 expand the bot's modes and the identity must hold across phases without rewrite

#### Scenario: Prompt contains the three-mode routing block

- **WHEN** `apps/api/src/features/chatbot/prompts/es/system.md` is inspected
- **THEN** it SHALL contain a routing block that names exactly three modes — `Modo A — Metodología`, `Modo B — Plataforma`, `Modo C — Conversacional` — each with the documented invocation rule. The block SHALL appear before the K=0 guardrail block so the model classifies BEFORE it considers the no-source fallback

#### Scenario: Prompt contains the platform-mode redirect literal

- **WHEN** `apps/api/src/features/chatbot/prompts/es/system.md` is inspected
- **THEN** it SHALL contain the literal `Esa pregunta corresponde al uso de la plataforma Huella Latam. Esa funcionalidad estará disponible en una próxima versión del asistente; por ahora puedo ayudarte con preguntas sobre metodología de huella de carbono.` byte-for-byte. This wording is asserted by test 10.35; if the wording is changed the test SHALL be updated in the same commit

#### Scenario: Modo B response does not invoke searchKnowledge

- **WHEN** the user posts a platform-usage question (e.g., `"¿cómo creo un inventario?"`, `"¿dónde veo los reportes?"`, `"¿cómo invito a un colega?"`)
- **THEN** the LLM SHALL classify the turn as Modo B and SHALL NOT emit a `tool_call` event for `searchKnowledge`; the assistant turn SHALL contain (and start with) the platform-redirect literal defined in item 4 of the system-prompt requirement

#### Scenario: Modo C response does not invoke searchKnowledge or open with the K=0 literal

- **WHEN** the user posts a conversational message (e.g., `"hola"`, `"gracias"`, `"¿quién te creó?"`)
- **THEN** the LLM SHALL classify the turn as Modo C and SHALL NOT emit a `tool_call` event; the assistant turn SHALL be a brief, natural Spanish response that does NOT start with the K=0 opener (`"No dispongo de fuentes verificadas..."`) and does NOT contain the platform-redirect literal — those wordings are reserved for Modo A's no-source path and Modo B respectively

#### Scenario: Modo C welcome response covers capabilities and roadmap on greeting/help queries

- **WHEN** the user posts a greeting or capability query (e.g., `"hola"`, `"¿qué puedes hacer?"`, `"ayuda"`, `"¿en qué me ayudas?"`)
- **THEN** the assistant turn SHALL include, in natural Spanish prose, all of: (a) a mention of methodology-related capabilities — at least one of the keywords `metodología`, `huella de carbono`, `alcances`, `factores de emisión` SHALL appear; (b) a mention that platform-usage guidance is coming — at least one of the phrases `próxima versión`, `próximas versiones`, `próximamente` SHALL appear; (c) the response SHALL be ≥ 2 sentences and ≤ 6 sentences (orientation, not a wall of text). The response SHALL NOT start with the K=0 opener and SHALL NOT contain the Modo B redirect literal

#### Scenario: Prompt contains the K=0 guardrail verbatim

- **WHEN** `apps/api/src/features/chatbot/prompts/es/system.md` is inspected
- **THEN** it SHALL contain (a) the literal opener `No dispongo de fuentes verificadas en mi corpus para responder esto con precisión.` and (b) the literal URL-invention prohibition `PROHIBIDO en este escenario: inventar URLs específicas, inventar números de sección (formato §X.Y), o inventar referencias bibliográficas.` Both substrings are asserted byte-for-byte by the K=0 fallback test; the prompt SHALL NOT paraphrase either

### Requirement: Tool result message includes pre-formatted Markdown citation links inline per chunk

The `executeSearchKnowledgeTool` function SHALL format the tool-result string returned to the LLM with each retrieved chunk rendered as a fully-formed Markdown link inline. Per-chunk shape SHALL be:

```
Fuente <n>: [<cite_label>](<cite_url>) - Contenido: "<snippet/content>"
```

where `<n>` is the 1-indexed position, `<cite_label>` and `<cite_url>` come from the chunk's metadata after Zod validation, and the snippet is the chunk content (truncated as appropriate). The intent is that the LLM copies the pre-formatted Markdown link verbatim into the assistant turn — the model SHALL NOT be asked to construct or reformat the URL itself, because that is the failure mode that produces hallucinated citation URLs.

#### Scenario: Tool-result string contains a Markdown link per chunk

- **WHEN** `executeSearchKnowledgeTool` returns a non-empty `chunks` array
- **THEN** the returned `toolResultMessage` SHALL contain, for each chunk, a substring matching the pattern `Fuente <n>: [<cite_label>](<cite_url>) - Contenido: "<...>"` where `<cite_label>` and `<cite_url>` are taken verbatim from the chunk's validated metadata

#### Scenario: K = 0 produces the strict empty-result wording

- **WHEN** `executeSearchKnowledgeTool` is invoked and either (a) `searchKnowledge` returns 0 chunks or (b) all chunks fail Zod validation at the streaming-handler boundary
- **THEN** the tool-result message injected by the streaming handler SHALL state `"0 fuentes válidas encontradas"` (Spanish, exact phrase) so the system prompt's K=0 guardrail matches against it

### Requirement: Endpoint registers the searchKnowledge tool definition for every chat completion

The handler SHALL pass `options.tools` containing exactly one tool definition: `searchKnowledge`. The tool declares a JSON Schema requiring only `query: string`. It SHALL NOT expose `topK`, `scope`, `sourceType`, or any other parameter. `tool_choice` is `"auto"`.

#### Scenario: Tool definition is passed on every turn

- **WHEN** the handler invokes `provider.streamCompletion`
- **THEN** `options.tools` SHALL be a non-empty array containing exactly one entry with `name = "searchKnowledge"` and a JSON-Schema parameters object that requires only a `query` field of type `string`

#### Scenario: Tool schema does not expose server-side defaults

- **WHEN** the tool definition is inspected
- **THEN** the JSON Schema's `properties` SHALL contain only `query`, and SHALL NOT contain `topK`, `scope`, `sourceType`, or any other field

### Requirement: Handler executes a single round of tool calling server-side

When the LLM provider yields a `tool_call` event terminating its first stream invocation, the handler SHALL execute the named tool server-side, append the tool result as a `role = TOOL` message (with `toolCallId` matching the event's `id`), and re-invoke `streamCompletion` once. The handler invokes this second round BEFORE `reply.hijack()` so errors map to standard HTTP responses (503 / 500). If the second invocation also yields `tool_call`, throw `ExternalServiceError` (generic Spanish error) and do not invoke a third round. The widget SHALL NOT receive `tool_call` events on the SSE wire — wire stream is `delta`, `done`, `error` only.

**CRITICAL release-gate invariant** — failure of the single-round-tool-calling-end-to-end scenario blocks merging to production per `tasks.md` test 10.3.

#### Scenario: First round tool_call triggers server-side execution and second round

- **WHEN** the first invocation of `provider.streamCompletion` yields a `tool_call` event with `name = "searchKnowledge"` and `arguments = '{"query":"alcances"}'`
- **THEN** the handler SHALL invoke `searchKnowledge` server-side with `query = "alcances"`, append the formatted result as a `role = TOOL` message with `toolCallId` matching the event's `id`, and invoke `provider.streamCompletion` a second time with the augmented messages — all BEFORE invoking `reply.hijack()`

#### Scenario: Second consecutive tool_call aborts the turn

- **WHEN** the second invocation yields a `tool_call` event (instead of `delta`/`usage`)
- **THEN** the handler SHALL throw `ExternalServiceError` and the response SHALL be HTTP 503 with code `EXTERNAL_SERVICE_ERROR` and the generic Spanish error message; SHALL NOT invoke a third round

#### Scenario: tool_call events are not emitted on the SSE wire

- **WHEN** any turn (with or without a tool round) reaches `reply.hijack()` and begins streaming
- **THEN** no SSE event written to `reply.raw` SHALL carry an event-type field of `tool_call`; the only event types SHALL be unnamed `data` (assistant deltas), terminal `done`, or terminal `error`

#### Scenario: Single-turn flow without tool_call is unchanged from foundation

- **WHEN** the first invocation yields only `delta` events followed by terminal `usage` (no `tool_call`)
- **THEN** the handler SHALL proceed directly to streaming and finalization per the foundation contract, without invoking the tool or re-invoking the provider

### Requirement: Handler persists sources_cited on the assistant message at finalization, with Zod validation and K=0 fallback

When the tool round produced chunks, the handler SHALL build a `sources` array of `{ source_id: bigint, chunk_id: bigint, cite_label: string, cite_url: string, snippet: string }` from `searchKnowledge` results. Each entry SHALL be validated against `SourceCitationSchema` (from `packages/types/src/chatbot/sourceCitation/`):

- `source_id`, `chunk_id`: positive integers (BigInt-coercible)
- `cite_label`: non-empty string after trim
- `cite_url`: parseable URL via `new URL(...)` whose protocol is `https:`
- `snippet`: string of length ≤ 240 (truncated from `content` if longer)

Three outcomes:

1. **N ≥ 1 chunks, K ≥ 1 valid**: persist K entries into the assistant row's `sources_cited` JSONB. Log (N − K) failures at `warn` with their `source_id`/`chunk_id`.
2. **N ≥ 1 chunks, K = 0**: inject a Spanish "0 fuentes válidas encontradas" tool-result into history before re-invoking. Persist `sources_cited = []`; omit `sources` from `done`.
3. **N = 0**: same as case 2.

Decision 19 in `design.md` carries the rationale.

**CRITICAL release-gate invariant (K = 0 path)** — failure of the all-sources-filtered scenario blocks merging to production per `tasks.md` test 10.4.

#### Scenario: K ≥ 1 persists the valid entries on the assistant row

- **WHEN** `searchKnowledge` returns 5 chunks and 4 pass Zod validation
- **THEN** the assistant row's `sources_cited` SHALL be a JSONB array of length 4 (the 4 valid entries), and a `warn`-level log entry SHALL name the dropped entry's `source_id` and `chunk_id`

#### Scenario: K = 0 routes through the no-source fallback

- **WHEN** `searchKnowledge` returns 3 chunks and all 3 fail Zod validation (e.g., malformed `cite_url`)
- **THEN** the handler SHALL inject the Spanish `"0 fuentes válidas encontradas"` tool-result into history, invoke the LLM second round, and the resulting assistant turn SHALL satisfy ALL of the following:
  - **(a) Opener invariant**: the assistant turn STARTS with the load-bearing literal `"No dispongo de fuentes verificadas en mi corpus para responder esto con precisión."` — leading whitespace permitted, but the first non-whitespace substring SHALL be that exact phrase.
  - **(b) No invented citations**: the assistant turn SHALL NOT contain any Markdown link of the form `[<label>](<url>)` and SHALL NOT contain any section reference of the form `§<digit>` (regex `/§\s*\d/`). Markdown links and section references are reserved for citation-backed answers (K ≥ 1); their presence in a K=0 response indicates the model fabricated traceability that does not exist. Quantitative content (factors, percentages, GWP values, dates) IS permitted in K=0 responses provided it does NOT take the form of an invented citation — the opener literal plus the persistent foot-of-chat disclaimer are the two layers that frame such content as referential rather than corpus-derived.
  - **(c) Persistence and wire**: the assistant row's `sources_cited` SHALL be `[]`, and the `done` payload SHALL NOT include a `sources` field.

  The redirect-to-external-sources clause is permitted but optional — the assistant MAY suggest consulting external authoritative sources (e.g., "el GHG Protocol Corporate Standard", "las metodologías del IPCC", "un verificador certificado") AFTER the opener as plain Spanish prose, NOT as Markdown links.

#### Scenario: N = 0 reaches the same fallback path

- **WHEN** `searchKnowledge` returns an empty array
- **THEN** the handler SHALL inject the empty-corpus tool-result, the second round SHALL produce the no-source fallback response, the assistant row's `sources_cited` SHALL be `[]`, and the `done` payload SHALL NOT include `sources`

#### Scenario: snippet field is truncated to 240 characters

- **WHEN** a chunk's `content` exceeds 240 characters
- **THEN** the corresponding `snippet` SHALL be the first 240 characters of `content`

#### Scenario: Zod schema lives in @repo/types

- **WHEN** the handler imports the source-citation schema
- **THEN** the import SHALL resolve from `@repo/types` (specifically `packages/types/src/chatbot/sourceCitation/schemas.ts`); no parallel schema SHALL be defined in `apps/api/src/`

### Requirement: done SSE event payload includes optional sources field when persisted citations exist

The terminal `done` payload SHALL change from `{ inputTokens, outputTokens }` to `{ inputTokens, outputTokens, sources?: SourceCitation[] }`. When `sources_cited` is non-empty (K ≥ 1), the field is present and matches the persisted JSONB byte-for-byte (after BigInt-to-string coercion). When `sources_cited` is empty (K = 0 / N = 0) or the turn did not invoke the tool, the field is absent (not `null`, not `[]`). Backward-compatible: foundation widgets that don't parse `sources` continue working.

#### Scenario: done event includes sources when K ≥ 1

- **WHEN** the assistant turn finalized with `sources_cited` containing 3 valid entries
- **THEN** the `done` SSE event's `data:` payload SHALL be a JSON object with `inputTokens`, `outputTokens`, and `sources` fields, where `sources` is an array of 3 entries matching the persisted JSONB (with `source_id` and `chunk_id` as strings for BigInt safety)

#### Scenario: done event omits sources when sources_cited is empty

- **WHEN** the assistant turn finalized with `sources_cited = []` (K = 0 or N = 0)
- **THEN** the `done` payload SHALL be a JSON object containing only `inputTokens` and `outputTokens`; the `sources` field SHALL be entirely absent

#### Scenario: done event omits sources when the tool was not invoked

- **WHEN** the assistant turn completed without yielding a `tool_call`
- **THEN** the `done` payload SHALL be a JSON object containing only `inputTokens` and `outputTokens`; the `sources` field SHALL be entirely absent

#### Scenario: Foundation widget compatibility

- **WHEN** a client that only parses `inputTokens` and `outputTokens` from the `done` payload receives a payload that includes `sources`
- **THEN** the client SHALL successfully parse `inputTokens` and `outputTokens` (the additional `sources` field SHALL NOT cause a JSON parse failure or other error in foundation-era code)

### Requirement: tokens_used on the assistant chat_message row uses the second-round usage event in the tool path

In the two-round (tool path) case introduced by this change, the values used to populate `chatbot_chat_message.tokens_used` on the assistant row SHALL come from the **SECOND (terminal) `usage` event** — the one that closed the assistant turn — NOT a sum across both rounds and NOT the first-round event (which carries no `usage` because the first invocation terminated on `tool_call`). The `tokens_used` value SHALL be `inputTokens + outputTokens` from that second-round `usage` event, matching the foundation contract.

> **Note on relationship to foundation**: foundation's `chatbot-message-streaming` spec already mandates `tokens_used = inputTokens + outputTokens` for every successful turn (see foundation requirement "Streamed assistant message is persisted with per-turn metrics on success"). This change does NOT add a new contract on the sum semantics — it only **extends** foundation's rule for the new tool-round path that did not exist in foundation, where two separate `usage` events fire and the handler must pick the right one. The non-tool case is fully governed by foundation; this requirement adds the tool-path clarification and a regression test that catches implementation drift on either path.

The implementation regression that motivates this clarification: the foundation handler persisted only `outputTokens` on the assistant row, contradicting foundation's own spec ("the per-turn total `inputTokens + outputTokens`"). That bug is fixed in this change's handler edit (Task 8.7); the tests below act as the regression guard going forward, on both the foundation-defined non-tool path AND the new tool path.

#### Scenario: tokens_used on a non-tool turn equals inputTokens + outputTokens (foundation contract regression guard)

- **WHEN** a turn completes without invoking the tool, the LLM provider yields a terminal `usage` event with `{ inputTokens: 12, outputTokens: 34 }`, and the handler finalizes
- **THEN** the persisted `chatbot_chat_message.tokens_used` for the assistant row SHALL be exactly `46` (12 + 34) per the foundation spec; this scenario is duplicated here as a regression guard against the previously-shipped output-only bug, NOT as a new contract

#### Scenario: tokens_used on a tool turn uses the SECOND usage event

- **WHEN** a turn invokes the tool, the first invocation yields a `tool_call` event (no `usage`), and the second invocation yields a terminal `usage` event with `{ inputTokens: 200, outputTokens: 80 }`
- **THEN** the persisted `chatbot_chat_message.tokens_used` for the assistant row SHALL be exactly `280` (200 + 80) — the value SHALL NOT be `80` alone (output only), `200` alone (input only), or any sum that includes the first-round counters (which are not reported by the provider)

#### Scenario: tokens_used matches the done payload's inputTokens + outputTokens

- **WHEN** any successful turn completes and emits its terminal `done` SSE event with `{ inputTokens: N, outputTokens: M, ... }`
- **THEN** the persisted `chatbot_chat_message.tokens_used` for the assistant row SHALL equal `N + M` — the wire and the persisted value cannot drift

## MODIFIED Requirements

### Requirement: Endpoint enforces token caps before invoking the LLM provider

The handler SHALL validate the token budget before invoking the `LLMProvider`. User message tokens SHALL NOT exceed `CHATBOT_MAX_USER_INPUT_TOKENS`. System prompt + prior history tokens SHALL NOT exceed `CHATBOT_MAX_HISTORY_TOKENS`. Tool-result message tokens within a turn SHALL NOT exceed `CHATBOT_MAX_RAG_CONTEXT_TOKENS = 12000`. Token counts use `estimateTokens(text)`. Any pre-LLM cap exceeded → HTTP 413 with `REQUEST_TOO_LARGE`. RAG-context cap exceeded after the first LLM round (response head already sent) → terminal SSE `error` with `code = "EXTERNAL_SERVICE_ERROR"` and the generic Spanish error.

#### Scenario: Oversized user input rejected

- **WHEN** the request body contains a user message whose `estimateTokens(content)` exceeds `CHATBOT_MAX_USER_INPUT_TOKENS`
- **THEN** the response SHALL be HTTP 413 with body `{ code: "REQUEST_TOO_LARGE", message: ... }` and SHALL NOT include any SSE events

#### Scenario: Oversized history rejected (now including system prompt)

- **WHEN** the system prompt plus the prior messages add up to an estimated token count exceeding `CHATBOT_MAX_HISTORY_TOKENS`
- **THEN** the response SHALL be HTTP 413 with code `REQUEST_TOO_LARGE` and SHALL NOT invoke the LLM provider

#### Scenario: Oversized RAG context aborts the second round

- **WHEN** the tool result message that would be appended for the second round has `estimateTokens(toolResultContent) > CHATBOT_MAX_RAG_CONTEXT_TOKENS`
- **THEN** the handler SHALL NOT invoke the second LLM round, SHALL emit a terminal SSE error event with `code = "EXTERNAL_SERVICE_ERROR"` and the generic Spanish error, and SHALL mark the assistant row `truncated = true` via the existing disconnect-finalizer path

#### Scenario: Per-turn turn cap unchanged

- **WHEN** the conversation already contains `CHATBOT_MAX_TURNS_PER_CONVERSATION` user messages and a new chat message arrives
- **THEN** the response SHALL be HTTP 413 with code `REQUEST_TOO_LARGE` (foundation behavior, unchanged)

#### Scenario: LLM provider not invoked on cap rejection

- **WHEN** any pre-LLM cap rejection occurs (user input or history)
- **THEN** `streamCompletion` SHALL NOT be called for that request

### Requirement: Successful turn ends with a `done` SSE event carrying usage

When the LLM stream completes successfully, the handler SHALL emit exactly one terminal SSE event with `event: done` and a `data:` payload carrying per-turn token usage:

```
event: done
data: {"inputTokens":N,"outputTokens":M[,"sources":[...]]}

```

`N` and `M` are non-negative integers; `sources`, when present, matches the persisted `sources_cited` shape.

#### Scenario: Successful stream emits the documented done event without sources

- **WHEN** the LLM provider yields its full stream and a terminal `usage` event with `{ inputTokens: 12, outputTokens: 34 }` AND the turn did not invoke the tool
- **THEN** the response SHALL emit exactly one terminal SSE event with `event: done` and `data: {"inputTokens":12,"outputTokens":34}` followed by the SSE blank-line terminator

#### Scenario: Successful stream emits the documented done event with sources

- **WHEN** the LLM provider yields its full stream and a terminal `usage` event with `{ inputTokens: 200, outputTokens: 80 }` AND the turn invoked the tool with K = 2 valid sources
- **THEN** the response SHALL emit exactly one terminal SSE event with `event: done` and `data:` matching `{"inputTokens":200,"outputTokens":80,"sources":[{...},{...}]}` followed by the SSE blank-line terminator; the `sources` array SHALL match the assistant row's `sources_cited` JSONB after BigInt-to-string coercion

#### Scenario: Done event is the last event on the stream

- **WHEN** the response emits any number of `data: ...` chunk events for assistant content
- **THEN** the very last event before connection close on a successful turn SHALL be the `done` event — no further `data:` content events SHALL follow it
