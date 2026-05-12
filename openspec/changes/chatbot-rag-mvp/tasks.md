## 1. Database & Migration (Block A)

- [x] 1.1 Bump the Postgres image to `pgvector/pgvector:pg18` in three places: `docker-compose.yml` (root), `packages/database/docker-compose.yml`, and `apps/api/test/setup/testcontainers.ts` (`TEST_DATABASE_CONFIG.image`). After the bump, locally run `pnpm db:restore` and `pnpm test --filter=api -- /chatbot --coverage=false` to confirm migrations apply and chatbot tests still pass against the new image.
- [x] 1.2 Local volume hygiene sub-task: developers with an existing `postgres-data` Docker volume from the prior image SHALL `docker compose down -v` before pulling the new image, because the `pgvector/pgvector:pg18` image's `initdb` will refuse to initialize over an existing data directory created by a different base image. Document this in `docs/development/local-setup.md` (one-paragraph note).
- [x] 1.3 Declare the embedding column in `packages/database/src/prisma/schema.prisma` on `ChatbotCorpusChunk` as `embedding Unsupported("vector(1024)")?`. Do NOT remove or rename any other field on the model.
- [x] 1.4 Generate the additive Prisma migration via `pnpm --filter @repo/database dev:migrate -- --name add_chatbot_embedding_and_pgvector` and inspect the generated SQL to confirm: (a) `CREATE EXTENSION IF NOT EXISTS vector` appears as the first statement (or earlier than any reference to the `vector(1024)` type); (b) `ALTER TABLE chatbot_corpus_chunk ADD COLUMN embedding vector(1024)` appears with NULL allowed; (c) the HNSW index `chatbot_corpus_chunk_embedding_hnsw_idx` is created `USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)`; (d) no other column or table is altered.
- [x] 1.5 Delete `apps/api/test/features/chatbot/lint/noReferencesToCorpusTables.test.ts`. Foundation declared the corpus tables dormant; this change lifts that dormancy. The lint test would now fail on legitimate ingest and retrieval code paths.
- [x] 1.6 Verify the migration runs cleanly on a freshly-spawned testcontainer by running the chatbot integration test suite end-to-end: `pnpm test --filter=api -- /chatbot --coverage=false`. The suite SHALL pass, including the new ingest and retrieval tests. If the testcontainer fails to start with the new image, audit the `withStartupTimeout` value in `testcontainers.ts` (the larger `pgvector/pgvector:pg18` image may need an extra ~30s on first CI pull).

## 2. Types & Schemas (Block A + B)

- [x] 2.1 Create `packages/types/src/chatbot/sourceCitation/schemas.ts` with the `SourceCitationSchema` Zod schema: `source_id` (string-or-bigint, coerced to bigint server-side), `chunk_id` (same), `cite_label` (non-empty trimmed string), `cite_url` (parseable HTTPS URL via `z.string().url()` plus a `.refine()` guard for the protocol), `snippet` (string, max length 240). Export both the schema and the inferred `SourceCitation` type.
- [x] 2.2 Create `packages/types/src/chatbot/sourceCitation/types.ts` exporting the inferred TypeScript type from the schema, plus a wire-shape variant where `source_id` and `chunk_id` are `string` (for safe BigInt JSON serialization in the `done` event payload and on the widget side).
- [x] 2.3 Extend `packages/types/src/chatbot/sendMessage/schemas.ts` — modify `SendMessageDoneEventSchema` to add an optional `sources` field of type `SourceCitationSchema[]`. Export the updated inferred type.
- [x] 2.4 Update `packages/types/src/chatbot/index.ts` to re-export the new `sourceCitation/` folder. Run `pnpm build --filter=types` to confirm the package still builds.
- [x] 2.5 Define `ChunkWithMetadata` type in `apps/api/src/features/chatbot/searchKnowledge/types.ts`. The retrieval function consumes Prisma's BigInt id types directly; the wire-shape conversion to strings happens at the handler boundary in `chatbot-message-streaming`.

## 3. EmbeddingProvider (Block A)

- [x] 3.1 Create `apps/api/src/features/chatbot/embeddingProvider/types.ts` declaring the `EmbeddingProvider` interface and the `EmbeddingResult` shape (`{ vectors: number[][]; inputTokens: number; model: string }`).
- [x] 3.2 Create `apps/api/src/features/chatbot/embeddingProvider/mock.ts` exporting an `EmbeddingProvider` whose `embed` produces deterministic 1024-dimensional vectors derived from each input via SHA-256: hash the input string, expand the 32-byte digest into 1024 float32 values via repeated hashing or seeded PRNG, normalize to unit length. `model` SHALL be the literal string `"mock-sha256-1024"`. Honor `options.signal` between batched computations. No imports from `openai`, `node:https`, `node:fetch`, `https`, `node-fetch`, or `axios`.
- [x] 3.3 Create `apps/api/src/features/chatbot/embeddingProvider/azureOpenAI.ts` exporting an `EmbeddingProvider` that uses the `openai` package's `AzureOpenAI` client. Read deployment name from `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME`; pass `dimensions: 1024` to the SDK call; set `model` on the result to the deployment name. Implement API key fallback: if `AZURE_OPENAI_API_KEY` env var is set to a non-empty trimmed string, use API key auth; otherwise use `DefaultAzureCredential`. Resolve API version from `AZURE_OPENAI_EMBEDDING_API_VERSION` env var, falling back to `AZURE_OPENAI_API_VERSION`. Pass `options.signal` to the SDK call.

  **Internal batching with safety margin**: implement batching that evaluates BOTH conditions per request: (a) the cumulative `estimateTokens` over the batch SHALL be ≤ **7782 tokens** (= `Math.floor(8192 * 0.95)`, named constant `AZURE_EMBED_BATCH_TOKEN_THRESHOLD` in the same file), AND (b) `texts.length` per SDK call SHALL be ≤ 16. A new batch starts when either condition would otherwise be violated. Use the shared `estimateTokens` helper from `apps/api/src/features/chatbot/llmProvider/estimateTokens.ts` — DO NOT inline a parallel formula (would trip the foundation-defined `chatbot/single-source-estimate-tokens` ESLint rule).

  **Why 7782, not 8192**: the foundation `estimateTokens` helper uses `Math.ceil(text.length / 4)` as a fixed heuristic (foundation contract, byte-for-byte test). For Spanish technical prose with diacritics, this can mildly underestimate against `cl100k_base` (the actual tokenizer). The 5% margin absorbs the drift; 8192 remains the documented Azure hard ceiling and is NOT touched by this internal threshold.

  **Per-input rejection (uses 8192, not 7782)**: before batching, validate every input individually — if any single input has `estimateTokens(input) > 8192`, throw an error with `error.name === "InputTooLargeError"` whose message names the offending input's index AND its estimated token count. This pre-empts an unrecoverable Azure HTTP 400. The per-input check uses the 8192 hard ceiling, NOT the 7782 batch margin (the margin only applies to cumulative batch totals).

- [x] 3.4 Create `apps/api/src/features/chatbot/embeddingProvider/index.ts` exporting `getEmbeddingProvider()` cached factory. Selection by `EMBEDDING_PROVIDER` env var.
- [x] 3.5 Extend the `chatbot/no-network-imports-in-mock` ESLint rule scope in `apps/api/eslint.config.ts` to apply to BOTH `apps/api/src/features/chatbot/llmProvider/mock.ts` and `apps/api/src/features/chatbot/embeddingProvider/mock.ts`. One single `files: [...]` block listing both file paths — do NOT duplicate the rule and do NOT use a second `files: [...]` block (the `chatbot-llm-provider` spec's "ESLint rule chatbot/no-network-imports-in-mock applies to both LLM and embedding mocks" requirement explicitly mandates exactly one block whose `files` array contains both targets).

## 4. LLMProvider Extensions (Block C-prep)

- [x] 4.1 In `apps/api/src/features/chatbot/llmProvider/types.ts`, extend `LlmMessage` to a discriminated union covering USER/SYSTEM, ASSISTANT (with optional `toolCalls`), and TOOL (with `toolCallId`). Add `LlmToolCall` and `LlmToolDefinition` types. Extend `LlmStreamEvent` with the `tool_call` variant. Extend `LlmStreamOptions` with optional `tools?: LlmToolDefinition[]`.
- [x] 4.2 Update `apps/api/src/features/chatbot/llmProvider/azureOpenAI.ts`: (a) forward `options.tools` to the SDK call's `tools` argument together with `tool_choice: "auto"`; (b) accumulate tool-call deltas across chunks (id, function.name, function.arguments) and emit one `tool_call` event when `finish_reason === "tool_calls"`; (c) translate `LlmMessage` with `role = TOOL` to `{ role: "tool", content, tool_call_id }` — REMOVE the foundation coercion of `TOOL → user` at lines 75-77; (d) implement API key fallback per OD-12; (e) read API version from the new `AZURE_OPENAI_API_VERSION` env var instead of the hardcoded constant.
- [x] 4.3 Update `apps/api/src/features/chatbot/llmProvider/mock.ts` to emit a deterministic `tool_call` event when the most recent USER message's content matches (case-insensitive substring) any of `"alcance"`, `"alcances"`, `"protocolo"`, `"factor"`. The emitted event SHALL be `{ type: "tool_call", id: "mock-call-<n>", name: "searchKnowledge", arguments: JSON.stringify({ query: <last-user-content> }) }`. On the second-round invocation (when messages include a TOOL entry following an ASSISTANT entry with `toolCalls`), yield the eco template incorporating the tool result instead of a `tool_call`.
- [x] 4.4 Promote the `AZURE_OPENAI_API_VERSION` constant: add it to `apps/api/src/config/environment.ts` (default `"2024-10-21"`); REMOVE the hardcoded constant from `azureOpenAI.ts`.
- [x] 4.5 Add `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` (required when `EMBEDDING_PROVIDER=azure-openai`) and optional `AZURE_OPENAI_EMBEDDING_API_VERSION` (defaults to `AZURE_OPENAI_API_VERSION`) to `apps/api/src/config/environment.ts`.
- [x] 4.6 Add `AZURE_OPENAI_API_KEY` (optional, trimmed; documented to be unset in production) to `apps/api/src/config/environment.ts`.
- [x] 4.7 Add `EMBEDDING_PROVIDER` parsing to `apps/api/src/config/environment.ts` using the same whitelist + IIFE-throw pattern as `LLM_PROVIDER`. Allowed values: `"mock"`, `"azure-openai"`. Add a boot-time guard that throws if `EMBEDDING_PROVIDER === "mock"` AND `IS_PROD` is `true`. Add a boot-time guard that throws if `EMBEDDING_PROVIDER === "azure-openai"` AND `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` is unset.

## 5. Ingest CLI (Block B)

- [x] 5.1 Add the `pdf-parse` runtime dependency to `apps/api/package.json` via `pnpm --filter api add pdf-parse`.
- [x] 5.2 Create `apps/api/scripts/chatbot/ingestCorpus.ts` implementing the CLI per the `chatbot-corpus-ingest` spec. Use a tsx shebang (`#!/usr/bin/env tsx`) and `process.exit(code)` for explicit exit codes. Output strings in Spanish.
- [x] 5.3 Create `apps/api/scripts/chatbot/chunking.ts` exporting the chunking helper. Target ~600 tokens per chunk with ~80 overlap. Detect section headings via the regex `^\d+(\.\d+)*\s+[A-Z]` on each line. Prefer header-aligned splits within ±150 tokens of the target boundary; fall back to sentence boundaries when no header is in range. Use the shared `estimateTokens` helper.
  - **pdf-parse newline robustness**: `pdf-parse` is known to flatten or destroy newlines on some PDF layouts (multi-column, soft-wrapped paragraphs), which causes the `^\d+(\.\d+)*\s+[A-Z]` line-anchored regex to match nothing. The chunker MUST flawlessly fall back to sentence boundaries when no header is found within the ±150-token window — not skip the chunk, not error, not produce a chunk wildly outside [400, 800] tokens. Sentence-boundary fallback MUST keep at least 80% of chunks in [400, 800] per the spec scenario, even on a PDF whose extracted text contains zero detectable headers.
  - **Tokenizer compatibility (rationale, not a contract change)**: the foundation `estimateTokens` helper uses the fixed `Math.ceil(text.length / 4)` heuristic and the `chatbot/single-source-estimate-tokens` ESLint rule (Task 3.3) makes that the single source of truth — this task SHALL NOT introduce a parallel formula. The 4-chars-per-token heuristic mildly underestimates Spanish technical prose against `cl100k_base` / `o200k_base`; this is a known limitation, and the embedding batcher (Task 3.3) absorbs the drift with a 5% safety margin (the `AZURE_EMBED_BATCH_TOKEN_THRESHOLD = floor(8192 * 0.95)` constant) which keeps Azure HTTP 400 errors out of the call path. If a follow-up change wants tighter accuracy, it should swap the helper itself in one place rather than re-implement counting per call site.
- [x] 5.4 Create `apps/api/scripts/chatbot/parsePdf.ts` thin wrapper around `pdf-parse` exposing `parsePdf(filePath: string): Promise<{ text: string; pages: number }>`. Surface `pdf-parse` errors as ingest-CLI errors with Spanish messages.
- [x] 5.5 Add `"chatbot:ingest": "tsx scripts/chatbot/ingestCorpus.ts"` to `apps/api/package.json` scripts. Confirm the script is invokable as `pnpm --filter api chatbot:ingest --help` (which prints usage in Spanish and exits 0).
- [x] 5.6 Document the test fixture path in a one-line comment at the top of `apps/api/test/features/chatbot/ingest/integration.test.ts`: `// Fixture path: apps/api/test/fixtures/chatbot/ghg-protocol-sample.pdf — committed in implementation phase, ~5 pp GHG Protocol Corporate Standard fair-use excerpt.`. The PDF binary itself is committed during implementation (separate commit, separate review).

## 6. Activate CLI (Block B)

- [x] 6.1 Create `apps/api/scripts/chatbot/activateCorpusSource.ts` implementing the CLI per the `chatbot-corpus-ingest` spec's "Activate CLI flips state atomically under an identity-scoped advisory lock" requirement. Use a single `prisma.$transaction(async (tx) => { ... })` whose first statement is `SELECT pg_advisory_xact_lock(('x' || substr(md5($key), 1, 16))::bit(64)::bigint)` with `$key = 'chatbot-corpus:' + name + ':' + scope`. The md5-cast-to-bigint form is portable across all Azure Postgres Flexible Server image variants we target — `hashtextextended` is NOT guaranteed to be exposed across every minor version and extension set, so do NOT use `hashtextextended($key, 0)`. `hashtext($key)` (32-bit) is an acceptable simpler alternative, but the 64-bit md5 form is preferred because it matches the advisory-lock space width. Validate target's `status = 'DRAFT'` after acquiring the lock; refuse non-DRAFT targets with a Spanish error message.
- [x] 6.2 Add `"chatbot:activate": "tsx scripts/chatbot/activateCorpusSource.ts"` to `apps/api/package.json` scripts.

## 7. Retrieval (Block B)

- [x] 7.1 Create `apps/api/src/features/chatbot/searchKnowledge/searchKnowledge.ts` implementing the pure function per the `chatbot-corpus-retrieval` spec. Use `prisma.$queryRaw` with bound parameters for `query` vector (formatted as a pgvector literal `[v1,v2,…]` via the bound-parameter mechanism), `scope`, `sourceType`, `topK`. Order by `embedding <=> $queryVector`. Return `ChunkWithMetadata[]`.
- [x] 7.2 Create `apps/api/src/features/chatbot/searchKnowledge/errors.ts` exporting `class InvalidQueryError extends Error { constructor(message: string) { super(message); this.name = "InvalidQueryError"; } }`. Throw on empty/whitespace-only `query` and on `topK` outside `[1, 20]`.
- [x] 7.3 Create `apps/api/src/features/chatbot/searchKnowledge/types.ts` exporting `ChunkWithMetadata` and the options shape `SearchKnowledgeOptions`.
- [x] 7.4 Create `apps/api/src/features/chatbot/searchKnowledge/index.ts` barrel re-exporting the function, types, and error.

## 8. Tool Integration & System Prompt (Block C)

- [x] 8.1 Create `apps/api/src/features/chatbot/prompts/es/system.md` (~30 lines, Spanish) covering, in this order:

  **(a) Forward-compatible identity (literal opening line)**:

  ```
  Eres el Asistente de Huella Latam, una plataforma para medir y reducir
  huella de carbono.
  ```

  Stable across V1/V2/V3/V4/V5 — DO NOT use "educativo" or "didáctico" as scope-narrowing modifiers.

  **(b) Phase-aware capability disclosure (literal)**:

  ```
  En esta versión inicial puedo responder preguntas sobre metodología de
  huella de carbono citando fuentes verificadas. Las funcionalidades de
  medición asistida y guía de uso de la plataforma llegarán en próximas
  versiones.
  ```

  **(c) Three-mode routing block (verbatim)**:

  ```
  Para cada mensaje del usuario, primero clasifica el modo y actúa según
  corresponda:

  Modo A — Metodología: preguntas sobre huella de carbono, alcances 1/2/3,
  factores de emisión, GHG Protocol, IPCC, ISO 14064, GWP, metodologías de
  cálculo. ACCIÓN: invoca la herramienta searchKnowledge y sigue el flujo
  de citas.

  Modo B — Plataforma: preguntas sobre el uso de la plataforma Huella Latam
  (cómo crear un inventario, cómo invitar usuarios, cómo solicitar
  verificación, navegación, configuración). ACCIÓN: NO invoques
  searchKnowledge. Responde EXACTAMENTE con: "Esa pregunta corresponde al
  uso de la plataforma Huella Latam. Esa funcionalidad estará disponible
  en una próxima versión del asistente; por ahora puedo ayudarte con
  preguntas sobre metodología de huella de carbono."

  Modo C — Conversacional / orientación: saludos, agradecimientos,
  meta-preguntas sobre el asistente, preguntas claramente fuera de huella
  de carbono y plataforma. ACCIÓN: respuesta breve y natural en español;
  NO invoques searchKnowledge; NO uses la frase del Modo A ni la del
  Modo B.

  Sub-guía para saludos y orientación: cuando el usuario salude ("hola",
  "buenas", "hi") o pregunte por tus capacidades ("¿qué puedes hacer?",
  "ayuda", "¿en qué me ayudas?", "qué eres"), responde con una bienvenida
  breve (entre 2 y 6 frases) que incluya, en redacción natural y libre:
  (1) lo que puedes hacer hoy: responder preguntas sobre metodología de
  huella de carbono, alcances 1/2/3 y factores de emisión, citando
  fuentes verificadas como GHG Protocol e IPCC; (2) la mención de que la
  guía sobre el uso de la plataforma y la medición asistida llegarán en
  próximas versiones; (3) una invitación a hacer una primera pregunta. La
  bienvenida es de tono cálido, no de límite — NO uses el opener del
  Modo A ni el redirect del Modo B.
  ```

  **(d) Mandatory-citation rule (Modo A only, brief)**: cite every factual claim with `[<cite_label>](<cite_url>)` derived from the searchKnowledge chunks. The K=0 guardrail block (below) applies only when searchKnowledge returned 0 valid chunks.

  **(e) K=0 guardrail (Modo A only)** SHALL appear verbatim:

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

  Two pieces are load-bearing for the test (10.4): (a) the opener literal — the assistant turn STARTS with `"No dispongo de fuentes verificadas en mi corpus para responder esto con precisión."` byte-for-byte; (b) the URL/citation-invention prohibition — the assistant turn in K=0 contains no Markdown link `[label](url)` and no `§X.Y` section reference. Quantitative content (factors, percentages, dates) IS permitted in the K=0 path provided it is calificado per the soft-guidance bullets. Do not paraphrase the opener or weaken the URL prohibition.

- [x] 8.2 Create `apps/api/src/features/chatbot/prompts/loader.ts` reading `prompts/es/system.md` once at module load (via `fs.readFileSync`), exporting `SYSTEM_PROMPT_ES: string`. Throw at boot if the file is missing or empty.
- [x] 8.3 Create `apps/api/src/features/chatbot/tools/searchKnowledge/schema.ts` exporting the `LlmToolDefinition` for `searchKnowledge`. The `description` SHALL be tight enough that the model does NOT invoke the tool for platform-usage or conversational turns. Use this literal Spanish description:

  ```
  Búsqueda semántica sobre el corpus de metodología de huella de carbono
  (GHG Protocol, IPCC, ISO 14064, normativas nacionales). Usa esta
  herramienta SOLO para preguntas educativas sobre huella de carbono,
  factores de emisión, alcances 1/2/3, GWP, y metodología de cálculo. NO
  la uses para preguntas sobre el uso de la plataforma Huella Latam
  (navegación, creación de inventarios, configuración, soporte) — esa
  funcionalidad pertenece a una próxima versión del asistente. NO la
  uses para saludos ni preguntas fuera del dominio de huella de carbono.
  ```

  JSON Schema: single required field `query: string` with `description: "La pregunta del usuario sobre metodología de huella de carbono, en español."`. No other parameters.

- [x] 8.4 Create `apps/api/src/features/chatbot/tools/searchKnowledge/execute.ts` exporting `executeSearchKnowledgeTool(prisma, argsJson) → Promise<{ chunks: ChunkWithMetadata[]; toolResultMessage: string }>`. The function parses `argsJson` (with Zod), invokes `searchKnowledge`, and formats a Spanish tool-result string for the LLM. Each chunk in the result string MUST be formatted with the EXACT Markdown link inline so the LLM can copy-paste it verbatim into the assistant turn — never asking the model to construct or reformat the URL itself. Required per-chunk shape:

  ```
  Fuente 1: [cite_label](cite_url) - Contenido: "<truncated chunk content>"
  Fuente 2: [cite_label](cite_url) - Contenido: "<truncated chunk content>"
  ```

  The intent: the LLM strict-citation behavior depends on the model copying a pre-formatted Markdown link, not hallucinating URL syntax. If the chunk's `cite_label` or `cite_url` fail Zod validation at the streaming-handler boundary, the chunk SHALL be filtered out before this string is formed; the K = 0 fallback path then applies the empty-corpus tool-result message (`"0 fuentes válidas encontradas"`) per the system prompt's strict guardrail in Task 8.1.

- [x] 8.5 Create `apps/api/src/features/chatbot/tools/searchKnowledge/index.ts` barrel.
- [x] 8.6 Modify `apps/api/src/features/chatbot/sendMessage/handler.ts`:
  - Prepend the system prompt as the first message in `llmMessages`.
  - Pass `tools: [searchKnowledgeToolDefinition]` to `provider.streamCompletion`.
  - Detect `tool_call` event from the first stream invocation; when seen, execute the tool server-side BEFORE `reply.hijack()`, append `role = TOOL` message with `toolCallId` matching the event's `id`, and re-invoke `streamCompletion` once.
  - Throw `ExternalServiceError` if the second invocation also yields `tool_call`.
  - Build `sources` array from the tool's chunks; validate each entry against `SourceCitationSchema`; route `K = 0` and `N = 0` through the empty-tool-result fallback path; persist `sources_cited` JSONB on the assistant row at finalization.
  - Emit the optional `sources` field in the `done` SSE event payload when `K ≥ 1` (with BigInts coerced to strings).
  - Enforce `CHATBOT_MAX_RAG_CONTEXT_TOKENS` against the tool-result message; if exceeded, emit a terminal SSE error event and rely on the disconnect finalizer to mark the assistant row truncated.

- [x] 8.7 **[FOUNDATION FIX]** `tokens_used` calculation correctness on `chat_message`. In the same finalization step that persists assistant content and `sources_cited`, set `chat_message.tokens_used = inputTokens + outputTokens`, where both counts are extracted from the LLM provider's terminal `usage` event. Foundation persisted only one of the two (output) on the assistant row; this change SHALL sum BOTH so per-turn cost analytics and the history-cap diagnostic read a faithful total. Applies on every successful turn — both single-round (no tool) and two-round (tool path); in the two-round case, `inputTokens`/`outputTokens` are taken from the SECOND (terminal) `usage` event since that is the one that closed the assistant turn. Add a regression assertion in an existing toolRound test (or a new sub-case) that the persisted `chat_message.tokens_used` equals `done.inputTokens + done.outputTokens` for both a tool turn and a non-tool turn.

## 9. Frontend Citation Rendering (Block C)

- [x] 9.1 Extend `apps/web/src/components/Chatbot/types.ts` — add `sourcesCited?: SourceCitation[]` to `ChatbotMessage`. Import or redeclare the wire-shape `SourceCitation` (BigInts as strings) from `@repo/types`.
- [x] 9.2 Modify `apps/web/src/components/Chatbot/useChatStream.ts` — parse the `done` event's `data:` payload, extract the optional `sources` field, and assign it to the in-flight assistant message via the same `updateLastAssistant` mutation path that updates content. Handle malformed payloads with a `console.warn` and treat as absent.
- [x] 9.3 Modify `apps/web/src/components/Chatbot/MessageBubble.tsx` — render a collapsible "Fuentes consultadas (<n>)" panel beneath the assistant bubble when `message.sourcesCited` is non-empty. Use MUI `Collapse`. Each row: anchor with `cite_label` text, `href = cite_url`, `target = "_blank"`, `rel = "noopener noreferrer"`; snippet text below the anchor in `theme.palette.text.secondary` smaller font.
- [x] 9.4 Confirm `react-markdown` configuration in `MessageBubble.tsx` rewrites inline links to open in a new tab via `target="_blank"` plus `rel="noopener noreferrer"`. If not already configured, add a `components: { a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" /> }` override to the `ReactMarkdown` element.

- [x] 9.5 **[FOUNDATION FIX — PM DECISION]** Trash icon (clear chat) behavior. The trash-icon click handler in the chatbot widget SHALL ONLY clear local React state — reset the message list to empty AND generate a fresh `conversation_id` (the next user message starts a new conversation thread for backend purposes). It SHALL NOT call any backend `DELETE` endpoint, and no such endpoint is added by this change. The persisted `chatbot_chat_conversation` and `chatbot_chat_message` rows in the database SHALL remain untouched — conversations are auditable, not user-deletable. Concretely:
  - Locate the existing trash-icon click handler in the widget (likely in `apps/web/src/components/Chatbot/` — header / toolbar component).
  - Remove any `fetch`/`apiClient` call to a `DELETE /chat/conversations/...` (or similar) path it currently makes; if no such call exists yet, just confirm.
  - Replace with: `setMessages([])` (or whatever local state mutation clears the message list) AND a `crypto.randomUUID()` (or existing UUID-generation helper) assigned to the `conversation_id` state so the next outgoing `sendMessage` carries a fresh id.
  - Surface the icon's tooltip/aria-label as `"Limpiar conversación"` (clear), NOT `"Eliminar conversación"` (delete) — the wording matters because the row is preserved.
  - Add a unit/integration test asserting that clicking the trash icon (a) clears the rendered message list, (b) does NOT trigger any HTTP request (assert via mocked `apiClient` / `fetch` spy that no DELETE is fired), and (c) the next outgoing `sendMessage` carries a `conversation_id` distinct from the one used before the click.
  - Rationale: PM-owned decision. Conversations are audit material; client-triggered hard delete is V4 admin-UI scope, not V1 widget scope. Documented in `design.md` Decision 25.

- [x] 9.6 Render a persistent foot-of-chat disclaimer beneath the input area in `apps/web/src/components/Chatbot/ChatbotWidget.tsx` (or wherever the input panel is composed). Use a `<Typography>` component with `variant="caption"` and `color="text.secondary"`, padding consistent with the input row, and the literal text `"Huella usa IA y puede equivocarse. Verifica las respuestas con las fuentes citadas."` byte-for-byte (no truncation, no emoji). The disclaimer SHALL be a static text node — no `onClick`, no dismiss button, no animation. It SHALL appear in every canonical widget state (`empty`, `loading`, `streaming`, `error`, `truncated`, `degraded`) so long as the widget panel is open.

- [x] 9.7 Render the "Eliminar mi historial" affordance in the foot of the widget panel (adjacent to the disclaimer from Task 9.6). Use a `<Button variant="text">` styled as a discrete text link with `theme.palette.text.secondary`, `variant="caption"` typography, and visible label `"Eliminar mi historial"`. The button SHALL be visually distinct from the trash icon (different position — foot vs. top, different size, different visual weight — text link vs. icon button). On click, open an MUI `<Dialog>` (or equivalent confirmation modal) with the literal copy:
  - Title: `"¿Eliminar tu historial de conversaciones?"`
  - Body: `"Esta acción es permanente. Se eliminarán todas las conversaciones asociadas a tu sesión y no podremos recuperarlas. ¿Quieres continuar?"`
  - Confirm button: `"Eliminar permanentemente"` with `color="error"` (destructive variant)
  - Cancel button: `"Cancelar"`

  On Confirm: issue `fetch('/api/chatbot/conversations/me', { method: 'DELETE', credentials: 'include' })` (NOT via `apiClient` / `ky` — same convention as the streaming endpoint per foundation widget spec). On HTTP 204: clear local message list, generate a fresh `conversation_id` (e.g., `crypto.randomUUID()`), transition the widget to the `empty` state, and surface a brief inline confirmation `"Tu historial fue eliminado"` (toast, snackbar, or inline transient message). On HTTP 5xx or network error: close the dialog, surface error message `"No pudimos eliminar tu historial. Intenta nuevamente más tarde."`, preserve local state — DO NOT retry automatically and DO NOT generate a fresh `conversation_id`.

  Visibility rule: hide the link only when the widget has never sent a message in the current session AND the local message list is empty. In every other state, show it. The link triggers the foundation-defined `DELETE` endpoint that already exists from `chatbot-conversation-deletion`; no new backend route is added.

## 10. Tests

CRITICAL tests gate production: any one failing blocks merge to `main`. Foundation introduced this convention; this change adds four CRITICAL tests covering the load-bearing invariants of RAG MVP.

- [x] 10.1 **[CRITICAL #1]** `apps/api/test/features/chatbot/searchKnowledge/integration.test.ts > excludes OUTDATED and DRAFT sources from results` — seed two sources, one with `status = 'OUTDATED'` and one with `status = 'DRAFT'`, plus one with `status = 'ACTIVE'`; insert chunks under each with embeddings; query `searchKnowledge` with a query whose embedding is closest to the OUTDATED chunk's embedding; assert the result contains ONLY the ACTIVE chunk (zero entries from DRAFT or OUTDATED, regardless of similarity). Maps to the `chatbot-corpus-retrieval` spec's CRITICAL-marked requirement "Retrieval always filters on `chatbot_corpus_source.status = 'ACTIVE'`".
- [x] 10.2 **[CRITICAL #2]** `apps/api/test/features/chatbot/ingest/integration.test.ts > happy path with valid PDF` — invoke the ingest CLI against `apps/api/test/fixtures/chatbot/ghg-protocol-sample.pdf` with valid args; assert (a) exactly one `chatbot_corpus_source` row exists with `status = 'DRAFT'`; (b) one or more `chatbot_corpus_chunk` rows exist with non-NULL `embedding` of length 1024; (c) one `chatbot_corpus_ingest_run` row exists with non-NULL `completed_at` and `chunks_created` matching the count. Maps to the `chatbot-corpus-ingest` spec's CRITICAL-marked requirement "Ingest CLI computes embeddings and inserts source plus chunks atomically".
- [x] 10.3 **[CRITICAL #3]** `apps/api/test/features/chatbot/toolRound/integration.test.ts > single-round tool calling end-to-end` — POST a message containing a keyword that triggers the mock tool_call (e.g., `"explicame los alcances 1, 2 y 3"`); seed an ACTIVE source plus chunks beforehand; assert the SSE stream produces only `delta` and `done` events (no `tool_call` event leaks); the assistant row's `sources_cited` is non-empty and matches the persisted JSONB; the `done` event payload includes a `sources` field matching `sources_cited` (with BigInts as strings). Maps to the `chatbot-message-streaming` spec's CRITICAL-marked requirement "Handler executes a single round of tool calling server-side".
- [x] 10.4 **[CRITICAL #4]** `apps/api/test/features/chatbot/toolRound/integration.test.ts > all-sources-filtered triggers middle-ground no-source fallback` — seed an ACTIVE source whose chunks all have malformed `cite_url` (e.g., `"not-a-url"` or empty string); POST a message that triggers the mock tool_call; assert ALL of the following on the assistant content captured from the SSE stream:
  - **(a) Opener invariant**: `assistantContent.trimStart().startsWith("No dispongo de fuentes verificadas en mi corpus para responder esto con precisión.")` returns `true`. The assistant turn SHALL start with the load-bearing literal byte-for-byte (leading whitespace permitted only).
  - **(b) No invented citations**: `assistantContent` SHALL NOT match `/\[[^\]]+\]\([^)]+\)/` (Markdown link pattern) and SHALL NOT match `/§\s*\d/` (section reference pattern). A single match fails the test with a message naming the offending excerpt.
  - **(c) Persistence and wire**: the assistant row's `sources_cited` is the empty array `[]`; the `done` event payload does NOT include a `sources` field.

  Maps to the `chatbot-message-streaming` spec's CRITICAL-marked K=0 scenario within "Handler persists sources_cited on the assistant message at finalization, with Zod validation and K=0 fallback". Quantitative content (factors, percentages, dates) is intentionally NOT asserted against — under Decision 14 it is permitted with soft caveats, and the opener literal + persistent foot disclaimer are the two layers of protection. If empirical drift on quality emerges from operator review, the eval suite (`chatbot-educate-mode-full`) is the right place to tighten — not this structural CRITICAL test.

Non-critical regression tests (must pass for merge but a single-test failure is investigable rather than a release-gate blocker):

- [ ] 10.5 `ingest/integration.test.ts > re-ingest with new version creates new DRAFT alongside existing ACTIVE` — seed an ACTIVE v05; invoke ingest with `--version v06`; assert two rows exist (v05 ACTIVE, v06 DRAFT).
- [ ] 10.6 `ingest/integration.test.ts > re-ingest collision on existing DRAFT fails fast with non-zero exit and Spanish error message` — seed a v05 DRAFT; invoke ingest with `--version v05`; assert non-zero exit code and stderr Spanish message naming the colliding source's id; assert no new rows inserted.
- [ ] 10.7 `ingest/integration.test.ts > audit row persists on embedding failure with NULL completed_at` — set `EMBEDDING_PROVIDER=mock` but stub the mock to throw; invoke ingest; assert no `chatbot_corpus_source` row exists for the attempt; assert one `chatbot_corpus_ingest_run` row exists with NULL `completed_at` and `source_id`.
- [ ] 10.8 `activate/integration.test.ts > flips OUTDATED on previous + ACTIVE on new in single transaction` — seed an ACTIVE v05 and a DRAFT v06 of the same `(name, scope)`; invoke activate on v06's id; assert v05 transitions to OUTDATED with non-NULL `deactivated_at`, v06 transitions to ACTIVE with non-NULL `activated_at`, both updates share commit timestamp.
- [ ] 10.9 `activate/integration.test.ts > advisory lock serializes concurrent activates with same (name, scope)` — seed two DRAFTs of the same `(name, scope)`; fire two concurrent `chatbot:activate` invocations targeting them via `Promise.allSettled`; assert exactly one ACTIVE row remains for that `(name, scope)` after both settle.
- [ ] 10.10 `activate/integration.test.ts > refuses non-DRAFT target with explicit Spanish error` — seed an OUTDATED row; invoke activate on its id; assert non-zero exit code, Spanish error message naming the current status, no row modified.
- [ ] 10.11 `searchKnowledge/integration.test.ts > scope and sourceType filters restrict results` — seed mixed ACTIVE sources of different `scope` and `source_type`; query with each filter combination; assert results match.
- [ ] 10.12 `searchKnowledge/integration.test.ts > empty query throws InvalidQueryError` — invoke `searchKnowledge("")`, `searchKnowledge("   ")`; assert each throws an error whose `name === "InvalidQueryError"`.
- [ ] 10.13 `searchKnowledge/integration.test.ts > out-of-range topK throws InvalidQueryError` — invoke with `topK = 0` and `topK = 21`; assert each throws `InvalidQueryError`.
- [ ] 10.14 `embeddingProvider/unit.test.ts > mock determinism + AbortSignal + no network imports` — assert determinism across two calls with same input; assert different inputs produce different vectors; assert AbortSignal honor; assert (via Vitest static check or grep over the file) that no forbidden import strings appear.
- [ ] 10.15 `embeddingProvider/unit.test.ts > mock-in-prod boot guard throws` — set `NODE_ENV=production` and `EMBEDDING_PROVIDER=mock`; import `apps/api/src/config/environment.ts`; assert the import throws.
- [ ] 10.16 `embeddingProvider/unit.test.ts > getEmbeddingProvider returns mock for EMBEDDING_PROVIDER=mock and Azure for azure-openai; throws on banana` — three subcases.
- [x] 10.17 `toolRound/integration.test.ts > second consecutive tool_call aborts with EXTERNAL_SERVICE_ERROR` — seed mock provider in a stub mode that emits `tool_call` on both invocations; POST a message; assert HTTP 503 with `EXTERNAL_SERVICE_ERROR` and the generic Spanish error message.
- [x] 10.18 `toolRound/integration.test.ts > done event includes BigInt-as-string sources` — seed with a tool round that produces K=2 valid sources; assert the SSE `done` event's `data:` JSON has `sources[0].source_id` and `sources[0].chunk_id` as strings (not numbers).
- [x] 10.19 `toolRound/integration.test.ts > non-tool turn omits sources from done payload` — POST a message that does NOT trigger the mock keyword; assert the SSE `done` event's `data:` JSON has only `inputTokens` and `outputTokens` (no `sources` field at all).
- [x] 10.20 `toolRound/integration.test.ts > system prompt counts toward CHATBOT_MAX_HISTORY_TOKENS` — set up a conversation history that with the system prompt prepended exceeds the cap; POST a new message; assert HTTP 413 with `REQUEST_TOO_LARGE`.
- [x] 10.21 `toolRound/integration.test.ts > oversized RAG context aborts the second round with terminal SSE error` — stub the searchKnowledge tool to return chunks whose joined content exceeds `CHATBOT_MAX_RAG_CONTEXT_TOKENS`; POST a message that triggers the mock tool_call; assert the SSE stream emits a terminal `error` event with `EXTERNAL_SERVICE_ERROR`; assert assistant row is `truncated = true`.
- [ ] 10.22 `widget/render.test.ts > MessageBubble renders Fuentes consultadas panel when sourcesCited non-empty` — render a `<MessageBubble>` with an assistant message carrying `sourcesCited` of length 2; assert a `Collapse`-driven panel exists with header `"Fuentes consultadas (2)"`; assert each row has an anchor with `target="_blank"` and `rel="noopener noreferrer"`.
- [ ] 10.23 `widget/render.test.ts > MessageBubble does not render panel when sourcesCited absent or empty` — two sub-cases.
- [x] 10.24 Test suite global setup: confirm `LLM_PROVIDER=mock`, `EMBEDDING_PROVIDER=mock`, `AUTH_PROVIDER=forced-user` are set in `apps/api/test/setup/globalSetup.ts` (or vitest config). Add `EMBEDDING_PROVIDER=mock` if missing.
- [x] 10.25 `toolRound/integration.test.ts > tokens_used on the assistant row equals inputTokens + outputTokens` — two sub-cases: (a) non-tool turn — POST a non-keyword message; assert the persisted `chatbot_chat_message.tokens_used` for the assistant row equals `done.inputTokens + done.outputTokens` (NOT just one of them); (b) tool turn — POST a keyword message that triggers the mock tool round; assert the persisted `tokens_used` equals the SECOND-round `done.inputTokens + done.outputTokens` and is strictly greater than the output-tokens-only value. Foundation regression guard for Task 8.7.
- [ ] 10.26 `embeddingProvider/unit.test.ts > Azure batcher splits on 17+ inputs even when token sum is small` — invoke the azureOpenAI provider's batcher with 17 short inputs whose cumulative `estimateTokens` is well below 8192; assert ≥ 2 SDK calls were issued (use a stub SDK to count invocations); assert no SDK call's `input` array exceeded length 16.
- [ ] 10.27 `embeddingProvider/unit.test.ts > Azure batcher splits on token cap even with few inputs` — invoke the batcher with inputs whose cumulative `estimateTokens` exceeds 8192 in fewer than 16 strings; assert ≥ 2 SDK calls and no call exceeded the 8192-token sum.
- [ ] 10.28 `widget/render.test.ts > trash icon click clears local state only` — render the widget with a populated message list; spy on `apiClient`/`fetch`; click the trash icon; assert (a) the rendered message list is empty, (b) zero HTTP requests were issued by the spy, (c) sending a new message after the click carries a `conversation_id` distinct from the one before, (d) the trash icon's aria-label is `"Limpiar conversación"`. Foundation regression guard for Task 9.5.
- [x] 10.29 `embeddingProvider/unit.test.ts > every returned vector has length 1024` — invoke the mock with 5 distinct inputs; assert every entry in `result.vectors` has `length === 1024` exactly. Cheap invariant guard against a regression where the SHA-256 expansion drifts to a different dimension.
- [x] 10.30 `embeddingProvider/unit.test.ts > mock vectors are L2-normalized` — invoke the mock with 5 distinct inputs; assert for each returned vector that `Math.abs(v.reduce((a, x) => a + x*x, 0) - 1) < 1e-6`. Locks the unit-sphere invariant against regressions in the normalization step.
- [ ] 10.31 `embeddingProvider/unit.test.ts > Azure batcher rejects single oversized input with InputTooLargeError` — stub `estimateTokens` to return 9000 for one of the inputs; invoke the azureOpenAI provider's batcher with `[shortInput, oversizedInput]`; assert the call rejects with `error.name === "InputTooLargeError"` whose message names index `1`; assert (via the SDK spy) that ZERO SDK calls were issued.
- [ ] 10.32 `searchKnowledge/integration.test.ts > oversized query is rejected with InvalidQueryError` — invoke `searchKnowledge` with a string whose `estimateTokens(query.trim())` exceeds 512; assert the call throws `InvalidQueryError` whose message names the cap; assert (via spy) that the embedding provider was NOT invoked and no SQL was executed.
- [ ] 10.33 `searchKnowledge/integration.test.ts > non-integer topK is rejected with InvalidQueryError` — invoke `searchKnowledge` with `options = { topK: 3.5 }` and `options = { topK: -1 }`; assert each throws `InvalidQueryError` whose message indicates the integer/range constraint; assert no SQL was executed in either case.
- [ ] 10.34 `widget/render.test.ts > foot-of-chat disclaimer is present in every state` — render the widget across each canonical state (`empty`, `loading`, `streaming`, `error`, `truncated`, `degraded`) by mocking the underlying state machine; for each state assert the rendered DOM contains an element with text content exactly `"Huella usa IA y puede equivocarse. Verifica las respuestas con las fuentes citadas."` (byte-for-byte) and that this element has no `onClick` handler, no `role="button"`, and no visible dismiss control. Foundation regression guard for Task 9.6.
- [x] 10.35 `toolRound/integration.test.ts > Modo B platform question does NOT invoke searchKnowledge and responds with redirect literal` — POST a message classified as platform usage (e.g., `"¿cómo creo un inventario?"`, `"¿dónde veo los reportes?"`, `"¿cómo invito a un colega?"`); assert (a) zero `tool_call` events leaked across the SSE stream — and via a server-side spy on `executeSearchKnowledgeTool`, that it was NOT invoked; (b) the assistant content contains the literal substring `"Esa pregunta corresponde al uso de la plataforma Huella Latam. Esa funcionalidad estará disponible en una próxima versión del asistente; por ahora puedo ayudarte con preguntas sobre metodología de huella de carbono."` byte-for-byte; (c) the assistant row's `sources_cited` is `[]`; (d) the `done` event payload does NOT include a `sources` field. Run this with three different platform-usage phrasings as sub-cases to assert the Modo B classification is robust, not over-fit to one wording.
- [x] 10.36 `toolRound/integration.test.ts > Modo C conversational and welcome behaviors` — split into two sub-suites:

  **(a) Plain conversational** — POST `"gracias"` and `"¿cómo estás?"`; assert: zero `tool_call` events; assistant content does NOT start with the K=0 opener `"No dispongo de fuentes verificadas en mi corpus para responder esto con precisión."`; does NOT contain the platform-redirect literal; the response is non-empty Spanish prose.

  **(b) Welcome / orientation** — POST `"hola"`, `"¿qué puedes hacer?"`, and `"ayuda"` as three sub-cases. For each, assert ALL of: (i) zero `tool_call` events; (ii) assistant content does NOT start with the K=0 opener and does NOT contain the platform-redirect literal; (iii) the response contains at least ONE of the keywords `"metodología"`, `"huella de carbono"`, `"alcances"`, `"factores de emisión"` (case-insensitive) — covers capability disclosure (a); (iv) the response contains at least ONE of the phrases `"próxima versión"`, `"próximas versiones"`, `"próximamente"` (case-insensitive) — covers roadmap mention (b); (v) the response is between 2 and 6 sentences inclusive (count `.`, `!`, `?` as sentence terminators excluding URL/decimal cases). A single sub-case failing fails the test naming the offending input and assertion.

- [x] 10.37 `prompts/loader.test.ts > system prompt contains the three-mode routing block` — read `apps/api/src/features/chatbot/prompts/es/system.md` at module load time; assert it contains all three of: `"Modo A — Metodología"`, `"Modo B — Plataforma"`, `"Modo C — Conversacional"` byte-for-byte, AND the platform-redirect literal byte-for-byte. This protects against the prompt being silently rewritten in a way that drops the routing scaffolding.
- [ ] 10.38 `widget/render.test.ts > "Eliminar mi historial" link triggers DELETE with confirmation flow` — render the widget with a populated message list; assert (a) the rendered DOM contains a button with visible text `"Eliminar mi historial"` in the foot of the panel (separate from the trash icon at the top); (b) clicking the link opens a dialog with title `"¿Eliminar tu historial de conversaciones?"`, body `"Esta acción es permanente. Se eliminarán todas las conversaciones asociadas a tu sesión y no podremos recuperarlas. ¿Quieres continuar?"`, confirm label `"Eliminar permanentemente"`, cancel label `"Cancelar"`; (c) clicking "Cancelar" closes the dialog AND fires zero HTTP requests (assert via `fetch` spy); (d) clicking "Eliminar permanentemente" with a stub returning HTTP 204 fires exactly one `DELETE /api/chatbot/conversations/me` with `credentials: "include"`, clears the message list, generates a fresh `conversation_id` distinct from the prior one, and surfaces the literal confirmation `"Tu historial fue eliminado"`; (e) clicking confirm with a stub returning HTTP 500 closes the dialog, preserves the message list intact, surfaces the literal `"No pudimos eliminar tu historial. Intenta nuevamente más tarde."`, fires no retry, and does NOT generate a fresh `conversation_id`. Five sub-cases. Compliance regression guard for D11.

## 11. Documentation

- [x] 11.1 Add a "Chatbot corpus ingestion and activation" section to `docs/operations/runbook.md` covering: the CLI invocations (`chatbot:ingest`, `chatbot:activate`); the re-ingest contract and the collision-on-DRAFT failure mode; the activation playbook (advisory lock, refuse-non-DRAFT semantics); the re-embed playbook for deployment-name rotation; the Azure Document Intelligence upgrade trigger (≥3 broken-chunk samples in manual review); the production constraint that `AZURE_OPENAI_API_KEY` SHALL be unset.
- [x] 11.2 Add `EMBEDDING_PROVIDER`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME`, `AZURE_OPENAI_EMBEDDING_API_VERSION` to `docs/development/environment-variables.md`. Document defaults, when each is required, and which environments each is set in.
- [x] 11.3 Add a one-paragraph note to `docs/development/local-setup.md` covering the `pgvector/pgvector:pg18` image bump and the `docker compose down -v` requirement for developers with pre-existing volumes.
- [x] 11.4 Add a sub-section to `docs/operations/runbook.md` documenting the path `apps/api/test/fixtures/chatbot/ghg-protocol-sample.pdf` and its expected properties (~5 pages of GHG Protocol Corporate Standard fair-use excerpt, parseable by `pdf-parse`, contains at least one section heading and one paragraph of definition text).

## 12. Verification

- [x] 12.1 Run `pnpm format --filter=api --filter=web --filter=types --filter=database`, `pnpm lint --filter=api --filter=web --filter=types --filter=database`, and `pnpm type-check` (global, since `@repo/types` changes propagate). Fix any issues introduced by this change. **If lint or type-check fails on files outside the chatbot scope, open a separate issue and do NOT fix in this change** — that is pre-existing technical debt out of scope. Lint enforces zero warnings.
- [ ] 12.2 Run `pnpm test --filter=api -- /chatbot --coverage=false`. All chatbot integration and unit tests SHALL pass, including the four CRITICAL tests (10.1, 10.2, 10.3, 10.4).
- [ ] 12.3 Run `pnpm test --filter=web -- chatbot --coverage=false` (or the equivalent for the widget tests). The MessageBubble citation-panel tests SHALL pass.
- [ ] 12.4 Local end-to-end smoke matching the Criterio de éxito stated in `proposal.md`: with `LLM_PROVIDER=azure-openai`, `EMBEDDING_PROVIDER=azure-openai`, `AZURE_OPENAI_API_KEY` set, and a manually-provisioned Azure OpenAI resource:
  - Run `pnpm --filter api chatbot:ingest path/to/ghg.pdf --label "GHG Protocol Corporate Standard" --version v05 --source-type PDF --scope GLOBAL --cite-url "https://ghgprotocol.org/corporate-standard"`. Confirm the script exits 0 and prints the source id and chunk count in Spanish.
  - Run `pnpm --filter api chatbot:activate <source-id>`. Confirm the script exits 0 and prints a Spanish success message.
  - In Prisma Studio, confirm the source row has `status = 'ACTIVE'` and N chunk rows exist with non-NULL embeddings.
  - Open `localhost:5173`, click the widget, send `"¿Qué son los alcances 1, 2 y 3 de emisiones según el GHG Protocol?"`. Observe the assistant response renders incrementally, includes inline `[GHG Protocol §X.Y](https://ghgprotocol.org/...)` markdown links, and the "Fuentes consultadas (n)" panel appears beneath the bubble.
  - In the database, confirm `chatbot_chat_message.sources_cited` for the assistant row matches the panel content.
  - **Modo A (metodología cubierta)**: send `"¿qué son los alcances 1, 2 y 3 de emisiones según el GHG Protocol?"`. Observe the response renders incrementally with inline `[GHG Protocol §X.Y](https://ghgprotocol.org/...)` markdown links and the "Fuentes consultadas (n)" panel appears beneath the bubble.
  - **Modo A (metodología NO cubierta — K=0 opener)**: send `"¿cuál es la población de Marte?"` (off-domain — methodology classifier still routes it through searchKnowledge in the V1 mock; the K=0 fallback fires). Observe the response opens with the literal `"No dispongo de fuentes verificadas en mi corpus para responder esto con precisión."` (verbatim, byte-for-byte; leading whitespace OK). The response SHALL NOT contain Markdown links `[label](url)` or `§X.Y` section references. Quantitative content with caveats (e.g., "aproximadamente 2.7 kg CO2/L según fuentes públicas") is acceptable per Decision 14. No "Fuentes consultadas" panel appears.
  - **Modo B (uso de plataforma)**: send `"¿cómo creo un inventario en la plataforma?"`. Observe the response contains the literal `"Esa pregunta corresponde al uso de la plataforma Huella Latam. Esa funcionalidad estará disponible en una próxima versión del asistente; por ahora puedo ayudarte con preguntas sobre metodología de huella de carbono."` byte-for-byte. The response SHALL NOT trigger searchKnowledge (Network tab: zero SSE chunks should reflect a tool round; total turn latency similar to a plain LLM call). No panel appears.
  - **Modo C (saludo/orientación)**: send `"hola"` or `"¿qué puedes hacer?"`. Observe a brief Spanish welcome (2–6 sentences) that mentions methodology capabilities (`metodología`, `huella de carbono`, `alcances`, `factores de emisión` — at least one) AND mentions that platform-usage guidance arrives in a future version (`próxima versión`/`próximas versiones`/`próximamente` — at least one). The response does NOT start with the K=0 opener and does NOT contain the platform-redirect literal. No panel appears. Then send `"gracias"` — expect a brief natural acknowledgement without the orientation block.
- [x] 12.5 Run `openspec validate chatbot-rag-mvp --strict`. The validation SHALL pass cleanly.
