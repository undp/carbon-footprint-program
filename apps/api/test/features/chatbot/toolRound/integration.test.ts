import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  inject,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import {
  ChatMessageRole,
  CorpusSourceScope,
  CorpusSourceStatus,
  CorpusSourceType,
} from "@repo/database/enums";
import { createTestApp } from "@test/factories/appFactory.js";
import { collectSseEvents } from "@test/helpers/sse.js";
import { getEmbeddingProvider } from "@/features/chatbot/embeddingProvider/index.js";
import { mockProvider } from "@/features/chatbot/llmProvider/mock.js";
import {
  CHATBOT_GENERIC_ERROR_MESSAGE,
  CHATBOT_K0_OPENER,
} from "@/features/chatbot/constants.js";
import * as searchKnowledgeTools from "@/features/chatbot/tools/searchKnowledge/index.js";

type WireSource = {
  source_id: string;
  chunk_id: string;
  cite_label: string;
  cite_url: string;
  snippet: string;
};

type DoneEventData = {
  inputTokens: number;
  outputTokens: number;
  sources?: WireSource[];
};

describe("POST /api/chatbot/message — toolRound integration", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    await app.listen({ port: 0, host: "127.0.0.1" });
  });

  afterAll(async () => {
    await prisma.chatbotChatConversation.deleteMany({});
    await prisma.chatbotCorpusChunk.deleteMany({});
    await prisma.chatbotCorpusSource.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.chatbotChatConversation.deleteMany({});
    await prisma.chatbotCorpusChunk.deleteMany({});
    await prisma.chatbotCorpusSource.deleteMany({});
  });

  afterEach(() => {
    // Restore vi.spyOn'd module exports between tests so a stub on
    // mockProvider in one test cannot leak into the next.
    vi.restoreAllMocks();
  });

  // Maps to the chatbot-message-streaming CRITICAL release-gate invariant:
  // "Handler executes a single round of tool calling server-side".
  //
  // The user message includes the substring "alcance", which triggers the
  // mock LLM provider to emit a `tool_call` event terminating round 1. The
  // handler must (a) intercept that event server-side (no leak to the SSE
  // wire), (b) execute searchKnowledge against the seeded ACTIVE source
  // (whose chunk has valid cite_label / cite_url so the Zod boundary
  // accepts it), (c) re-invoke the provider once with the TOOL result
  // appended, (d) persist sources_cited on the assistant row, and (e) emit
  // the `done` payload with `sources` matching the persisted JSONB
  // byte-for-byte (with BigInts coerced to strings).
  it("single-round tool calling end-to-end", async () => {
    const ACTIVE_LABEL = "GHG Protocol §2.3";
    const ACTIVE_URL = "https://ghgprotocol.org/corporate-standard";
    const CHUNK_CONTENT =
      "Las emisiones de alcance 1 son emisiones directas de fuentes propias o controladas por la organización.";

    const activeSource = await prisma.chatbotCorpusSource.create({
      data: {
        name: "GHG Protocol Corporate Standard",
        version: "v05",
        sourceType: CorpusSourceType.PDF,
        scope: CorpusSourceScope.GLOBAL,
        status: CorpusSourceStatus.ACTIVE,
        activatedAt: new Date(),
        citeLabel: ACTIVE_LABEL,
        citeUrl: ACTIVE_URL,
      },
    });

    const embeddingProvider = getEmbeddingProvider();
    const { vectors } = await embeddingProvider.embed([CHUNK_CONTENT]);
    const toVectorLiteral = (v: number[]): string => `[${v.join(",")}]`;
    await prisma.$executeRaw`
      INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
      VALUES (${activeSource.id}, 0, ${CHUNK_CONTENT}, ${toVectorLiteral(vectors[0])}::vector)
    `;

    const { status, events } = await collectSseEvents(
      app,
      "/api/chatbot/message",
      { content: "explicame los alcances 1, 2 y 3" },
      { ownsApp: false }
    );

    expect(status).toBe(200);

    // The CRITICAL release-gate phrase: "wire stream is `delta`, `done`,
    // `error` only" — assert no `tool_call`-named event leaks to the SSE
    // wire even though the mock emitted one upstream of the handler.
    const toolCallEvents = events.filter((e) => e.event === "tool_call");
    expect(toolCallEvents).toHaveLength(0);

    const deltas = events.filter((e) => !e.event);
    const doneEvents = events.filter((e) => e.event === "done");
    expect(deltas.length).toBeGreaterThanOrEqual(1);
    expect(doneEvents).toHaveLength(1);

    const done = doneEvents[0].data as DoneEventData;
    expect(done.sources).toBeDefined();
    expect(done.sources).toHaveLength(1);
    const wireSource = done.sources![0];
    // BigInt-as-string contract on the wire — JSON.stringify would have
    // serialized a bigint as a number and Prisma would have round-tripped
    // a real bigint back as `number | bigint`. The handler explicitly
    // coerces both id fields to string before emit; this asserts the
    // contract that the widget depends on for safe parsing.
    expect(typeof wireSource.source_id).toBe("string");
    expect(typeof wireSource.chunk_id).toBe("string");
    expect(wireSource.cite_label).toBe(ACTIVE_LABEL);
    expect(wireSource.cite_url).toBe(ACTIVE_URL);
    expect(wireSource.snippet).toBe(CHUNK_CONTENT);
    expect(wireSource.source_id).toBe(activeSource.id.toString());

    const assistantRows = await prisma.chatbotChatMessage.findMany({
      where: { role: ChatMessageRole.ASSISTANT },
      orderBy: { id: "asc" },
    });
    expect(assistantRows).toHaveLength(1);
    const assistantRow = assistantRows[0];
    expect(assistantRow.sourcesCited).not.toBeNull();
    const persisted = assistantRow.sourcesCited as unknown as WireSource[];
    expect(persisted).toHaveLength(1);
    // Persisted JSONB and wire `sources` must match byte-for-byte (per the
    // spec scenario "done event includes sources when K ≥ 1" — "matches the
    // persisted JSONB after BigInt-to-string coercion").
    expect(persisted).toEqual(done.sources);
  });

  // Maps to the chatbot-message-streaming CRITICAL release-gate invariant
  // K=0 path: "Handler persists sources_cited on the assistant message at
  // finalization, with Zod validation and K=0 fallback".
  //
  // Setup: one ACTIVE source whose `cite_url` is intentionally malformed
  // ("not-a-url"). Two chunks under it. `searchKnowledge` returns both
  // chunks (status=ACTIVE filter passes), but `SourceCitationSchema`'s
  // `httpsUrl` refinement rejects each candidate because the URL is not
  // parseable as HTTPS — so `validSources` becomes empty after Zod
  // filtering. The handler then injects the "0 fuentes válidas
  // encontradas" tool result, re-invokes the LLM, and the mock detects
  // `isSecondRound` + `isEmptyToolResult` to yield the K=0 opener literal.
  //
  // The three assertion blocks below are load-bearing per task 10.4 — a
  // regression on any one of them is a release-gate failure.
  it("all-sources-filtered triggers middle-ground no-source fallback", async () => {
    const BROKEN_CHUNK_1 =
      "Contenido del chunk uno: las emisiones de proceso varían según el sector productivo.";
    const BROKEN_CHUNK_2 =
      "Contenido del chunk dos: el factor de emisión depende de la fuente y la metodología.";

    // citeLabel passes Zod (non-empty trimmed string), citeUrl
    // intentionally fails the SourceCitationSchema httpsUrl refinement
    // (not parseable as URL at all). This is the exact "malformed
    // cite_url" path the task lists as an example.
    const brokenSource = await prisma.chatbotCorpusSource.create({
      data: {
        name: "BrokenSource",
        version: "v01",
        sourceType: CorpusSourceType.PDF,
        scope: CorpusSourceScope.GLOBAL,
        status: CorpusSourceStatus.ACTIVE,
        activatedAt: new Date(),
        citeLabel: "Broken Source",
        citeUrl: "not-a-url",
      },
    });

    const embeddingProvider = getEmbeddingProvider();
    const { vectors } = await embeddingProvider.embed([
      BROKEN_CHUNK_1,
      BROKEN_CHUNK_2,
    ]);
    const toVectorLiteral = (v: number[]): string => `[${v.join(",")}]`;
    await prisma.$executeRaw`
      INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
      VALUES (${brokenSource.id}, 0, ${BROKEN_CHUNK_1}, ${toVectorLiteral(vectors[0])}::vector)
    `;
    await prisma.$executeRaw`
      INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
      VALUES (${brokenSource.id}, 1, ${BROKEN_CHUNK_2}, ${toVectorLiteral(vectors[1])}::vector)
    `;

    const { status, events } = await collectSseEvents(
      app,
      "/api/chatbot/message",
      { content: "explicame los alcances 1, 2 y 3" },
      { ownsApp: false }
    );

    expect(status).toBe(200);

    // Wire-level invariant: tool_call must never leak (foundation pin).
    expect(events.filter((e) => e.event === "tool_call")).toHaveLength(0);

    const deltas = events.filter((e) => !e.event);
    expect(deltas.length).toBeGreaterThanOrEqual(1);
    const assistantContent = deltas
      .map((e) => (e.data as { content: string }).content)
      .join("");

    // (a) Opener invariant — byte-for-byte literal at the start of the
    // turn. Leading whitespace permitted per the task wording.
    const OPENER =
      "No dispongo de fuentes verificadas en mi corpus para responder esto con precisión.";
    expect(assistantContent.trimStart().startsWith(OPENER)).toBe(true);

    // (b) No invented citations — Markdown link pattern and section
    // reference pattern are reserved for citation-backed turns. Their
    // presence in a K=0 response indicates fabricated traceability.
    // Quantitative content (cifras, factores, dates) is intentionally NOT
    // asserted against — Decision 14 permits it with soft caveats.
    expect(assistantContent).not.toMatch(/\[[^\]]+\]\([^)]+\)/);
    expect(assistantContent).not.toMatch(/§\s*\d/);

    // (c) Persistence: assistant row carries `sources_cited = []`
    // (empty array, not null — the handler always writes finalSources,
    // and an empty array passes through Prisma as a valid JSON value).
    const assistantRows = await prisma.chatbotChatMessage.findMany({
      where: { role: ChatMessageRole.ASSISTANT },
      orderBy: { id: "asc" },
    });
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].sourcesCited).toEqual([]);

    // (c) Wire: done payload OMITS the `sources` field entirely — not
    // null, not []. The spec uses "entirely absent" wording; foundation
    // widgets that look for the field's absence must see `undefined`
    // after `JSON.parse`, which is only possible if the server-side
    // serializer never emitted the key.
    const doneEvents = events.filter((e) => e.event === "done");
    expect(doneEvents).toHaveLength(1);
    expect(doneEvents[0].data).not.toHaveProperty("sources");
  });

  // Maps to spec scenario "Assistant K=0 opener empties sources_cited even
  // when K ≥ 1": 8 validated chunks but stubbed round 2 emits the opener →
  // sources_cited persisted as [], `done` omits `sources`.
  it("K ≥ 1 valid sources but assistant emits K=0 opener empties sources_cited", async () => {
    const ACTIVE_LABEL = "GHG Protocol §2.3";
    const ACTIVE_URL = "https://ghgprotocol.org/corporate-standard";
    const CHUNK_CONTENTS = Array.from(
      { length: 8 },
      (_, i) =>
        `Chunk ${i}: las emisiones de alcance 1/2/3 se rigen por GHG Protocol Corporate Standard.`
    );

    const activeSource = await prisma.chatbotCorpusSource.create({
      data: {
        name: "GHG Protocol Corporate Standard",
        version: "v05",
        sourceType: CorpusSourceType.PDF,
        scope: CorpusSourceScope.GLOBAL,
        status: CorpusSourceStatus.ACTIVE,
        activatedAt: new Date(),
        citeLabel: ACTIVE_LABEL,
        citeUrl: ACTIVE_URL,
      },
    });

    const embeddingProvider = getEmbeddingProvider();
    const { vectors } = await embeddingProvider.embed(CHUNK_CONTENTS);
    const toVectorLiteral = (v: number[]): string => `[${v.join(",")}]`;
    for (let i = 0; i < 8; i++) {
      await prisma.$executeRaw`
        INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
        VALUES (${activeSource.id}, ${i}, ${CHUNK_CONTENTS[i]}, ${toVectorLiteral(vectors[i])}::vector)
      `;
    }

    // Round 1 → tool_call; round 2 → opener literal. Counter is hoisted
    // outside the generator because mockImplementationOnce doesn't compose
    // cleanly with async generators.
    let invocationCount = 0;
    vi.spyOn(mockProvider, "streamCompletion").mockImplementation(
      async function* () {
        await Promise.resolve();
        invocationCount += 1;
        if (invocationCount === 1) {
          yield {
            type: "tool_call",
            id: "stub-call-1",
            name: "searchKnowledge",
            arguments: JSON.stringify({ query: "scope 4" }),
          };
          return;
        }
        yield {
          type: "delta",
          content: `${CHATBOT_K0_OPENER} Si lo deseas, puedes consultar fuentes externas autorizadas como el GHG Protocol Corporate Standard.`,
        };
        yield { type: "usage", inputTokens: 200, outputTokens: 50 };
      }
    );

    const { status, events } = await collectSseEvents(
      app,
      "/api/chatbot/message",
      {
        content: "¿qué dice el GHG Protocol sobre las emisiones de scope 4?",
      },
      { ownsApp: false }
    );

    expect(status).toBe(200);
    expect(invocationCount).toBe(2);

    const deltas = events.filter((e) => !e.event);
    const assistantContent = deltas
      .map((e) => (e.data as { content: string }).content)
      .join("");
    expect(assistantContent.trimStart().startsWith(CHATBOT_K0_OPENER)).toBe(
      true
    );

    // sources_cited = [] is load-bearing: without the handler's opener
    // check this row would carry 8 entries (the pre-fix behavior).
    const assistantRows = await prisma.chatbotChatMessage.findMany({
      where: { role: ChatMessageRole.ASSISTANT },
      orderBy: { id: "asc" },
    });
    expect(assistantRows).toHaveLength(1);
    expect(assistantRows[0].sourcesCited).toEqual([]);

    const doneEvents = events.filter((e) => e.event === "done");
    expect(doneEvents).toHaveLength(1);
    expect(
      Object.prototype.hasOwnProperty.call(doneEvents[0].data, "sources")
    ).toBe(false);
  });

  // Maps to chatbot-message-streaming spec scenario "Second consecutive
  // tool_call aborts the turn":
  //   THEN the handler SHALL throw `ExternalServiceError` and the response
  //   SHALL be HTTP 503 with code `EXTERNAL_SERVICE_ERROR` and the generic
  //   Spanish error message; SHALL NOT invoke a third round.
  //
  // Stub the mock provider so EVERY invocation emits a `tool_call` event —
  // the first invocation triggers the tool round, and the second invocation
  // (which the handler executes after appending the TOOL result) emits a
  // second consecutive tool_call. That second event hits the abort branch.
  it("second consecutive tool_call aborts with EXTERNAL_SERVICE_ERROR", async () => {
    vi.spyOn(mockProvider, "streamCompletion").mockImplementation(
      async function* () {
        // Match the mock's pattern: yield to the microtask queue so the
        // async generator behaves like a real provider that emits events
        // off-thread. Also satisfies @typescript-eslint/require-await for
        // this async function.
        await Promise.resolve();
        yield {
          type: "tool_call",
          id: `forced-${Math.random().toString(36).slice(2)}`,
          name: "searchKnowledge",
          arguments: JSON.stringify({ query: "x" }),
        };
      }
    );

    // After the deferred-hijack restructure, this path throws
    // ExternalServiceError pre-hijack — Fastify's error handler emits a
    // standard JSON 503 (no SSE frames), so app.inject is the right tool
    // for body inspection (collectSseEvents would see zero frames).
    const response = await app.inject({
      method: "POST",
      url: "/api/chatbot/message",
      payload: { content: "explicame los alcances" },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      code: "EXTERNAL_SERVICE_ERROR",
      message: CHATBOT_GENERIC_ERROR_MESSAGE,
    });
  });

  // Maps to spec scenario "done event includes sources when K ≥ 1":
  //   the `sources` array SHALL match the assistant row's `sources_cited`
  //   JSONB after BigInt-to-string coercion.
  //
  // The existing 10.3 test covers K=1; this test extends to K=2 to guard
  // against a regression where the BigInt → string coercion only fires on
  // the first element of the array (e.g., if a typo replaced .map with
  // accessing [0]).
  it("done event includes BigInt-as-string sources for K=2", async () => {
    const CITE_LABEL = "GHG Protocol §1.1";
    const CITE_URL = "https://ghgprotocol.org/corporate-standard";
    const CONTENT_1 = "Las emisiones de alcance 1 cubren fuentes directas.";
    const CONTENT_2 = "Las emisiones de alcance 2 cubren energía adquirida.";

    const source = await prisma.chatbotCorpusSource.create({
      data: {
        name: "GHG Protocol Corporate Standard",
        version: "v05",
        sourceType: CorpusSourceType.PDF,
        scope: CorpusSourceScope.GLOBAL,
        status: CorpusSourceStatus.ACTIVE,
        activatedAt: new Date(),
        citeLabel: CITE_LABEL,
        citeUrl: CITE_URL,
      },
    });

    const embeddingProvider = getEmbeddingProvider();
    const { vectors } = await embeddingProvider.embed([CONTENT_1, CONTENT_2]);
    const toVectorLiteral = (v: number[]): string => `[${v.join(",")}]`;
    await prisma.$executeRaw`
      INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
      VALUES (${source.id}, 0, ${CONTENT_1}, ${toVectorLiteral(vectors[0])}::vector)
    `;
    await prisma.$executeRaw`
      INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
      VALUES (${source.id}, 1, ${CONTENT_2}, ${toVectorLiteral(vectors[1])}::vector)
    `;

    const { status, events } = await collectSseEvents(
      app,
      "/api/chatbot/message",
      { content: "explicame los alcances 1 y 2" },
      { ownsApp: false }
    );

    expect(status).toBe(200);
    const doneEvents = events.filter((e) => e.event === "done");
    expect(doneEvents).toHaveLength(1);
    const done = doneEvents[0].data as DoneEventData;
    expect(done.sources).toBeDefined();
    expect(done.sources).toHaveLength(2);
    for (const wireSource of done.sources!) {
      // Both id fields SHALL be strings on the wire (BigInt safety).
      expect(typeof wireSource.source_id).toBe("string");
      expect(typeof wireSource.chunk_id).toBe("string");
      expect(wireSource.cite_label).toBe(CITE_LABEL);
      expect(wireSource.cite_url).toBe(CITE_URL);
    }

    // Both ids match the seeded source.id and the inserted chunk rows. The
    // chunk_ids come from the DB autoincrement; we don't pin specific
    // values, only that they're string-typed numeric ids.
    expect(done.sources![0].source_id).toBe(source.id.toString());
    expect(done.sources![1].source_id).toBe(source.id.toString());
    expect(done.sources![0].chunk_id).not.toBe(done.sources![1].chunk_id);
  });

  // Maps to spec scenarios:
  //  - "done event omits sources when the tool was not invoked"
  //  - "Successful stream emits the documented done event without sources"
  //
  // Asserts that on a turn that did NOT trigger the mock keyword (so no
  // tool_call was emitted, no tool round ran), the `done` payload contains
  // ONLY inputTokens and outputTokens. The `sources` key SHALL be entirely
  // absent on the wire — not present-and-empty, not null.
  it("non-tool turn omits sources from done payload", async () => {
    // "mensaje cualquiera sin palabras clave" matches none of the mock's
    // routing cues (TOOL_CALL_KEYWORDS, platformCues), so the eco template
    // fallback fires — no tool_call event, no second invocation, no
    // finalSources populated.
    const { status, events } = await collectSseEvents(
      app,
      "/api/chatbot/message",
      { content: "mensaje cualquiera sin palabras clave" },
      { ownsApp: false }
    );

    expect(status).toBe(200);
    const doneEvents = events.filter((e) => e.event === "done");
    expect(doneEvents).toHaveLength(1);
    const done = doneEvents[0].data as Record<string, unknown>;
    // Spec wording: `sources` field SHALL be entirely absent. Check the
    // raw property — `hasOwnProperty` distinguishes absent vs. present-but-
    // undefined, which would round-trip through JSON differently.
    expect(Object.prototype.hasOwnProperty.call(done, "sources")).toBe(false);
    expect(done.inputTokens).toEqual(expect.any(Number));
    expect(done.outputTokens).toEqual(expect.any(Number));
  });

  // Maps to spec scenario "Oversized history rejected (now including system
  // prompt)":
  //   THEN the response SHALL be HTTP 413 with code `REQUEST_TOO_LARGE` and
  //   SHALL NOT invoke the LLM provider.
  //
  // Strategy: post once to materialize a conversation row (with the
  // forced-user identity), then directly INSERT 5 huge messages into that
  // conversation via Prisma to bypass the handler's caps. Each huge message
  // contributes ~2000 estimated tokens (8000 chars / 4); 5 messages plus
  // the system prompt (~870 tokens for the ~3.5 KB prompt file) push the
  // cap-check input above the 8000-token CHATBOT_MAX_HISTORY_TOKENS budget.
  // A subsequent POST then trips enforceHistoryCap before the LLM is
  // invoked.
  it("system prompt counts toward CHATBOT_MAX_HISTORY_TOKENS", async () => {
    // First request: seeds the conversation row + 2 small messages.
    const seed = await collectSseEvents(
      app,
      "/api/chatbot/message",
      { content: "primer mensaje pequeño" },
      { ownsApp: false }
    );
    expect(seed.status).toBe(200);

    const conv = await prisma.chatbotChatConversation.findFirst({
      orderBy: { id: "desc" },
    });
    expect(conv).not.toBeNull();

    // 8000 chars = ~2000 estimated tokens per inserted row. Five rows
    // contribute ~10000 tokens of history content, well above the cap
    // even before the system prompt's ~870-token contribution.
    const HUGE = "a".repeat(8000);
    for (let i = 0; i < 5; i++) {
      await prisma.chatbotChatMessage.create({
        data: {
          conversationId: conv!.id,
          role: i % 2 === 0 ? ChatMessageRole.USER : ChatMessageRole.ASSISTANT,
          content: HUGE,
          tokensUsed: 2000,
          latencyMs: 10,
        },
      });
    }

    const { status } = await collectSseEvents(
      app,
      "/api/chatbot/message",
      { content: "segundo mensaje" },
      { ownsApp: false }
    );
    expect(status).toBe(413);
  });

  // Maps to spec scenario "Oversized RAG context aborts the second round":
  //   THEN the handler SHALL NOT invoke the second LLM round, SHALL emit a
  //   terminal SSE error event with `code = "EXTERNAL_SERVICE_ERROR"` and
  //   the generic Spanish error, and SHALL mark the assistant row
  //   `truncated = true` via the existing disconnect-finalizer path.
  //
  // The natural path (snippet truncation at 240 chars × topK=8) caps the
  // toolResultMessage at ~2 KB, well below the 12000-token budget. To
  // exceed the budget we seed a source whose `cite_label` and `cite_url`
  // are each ~5 KB; with 8 chunks the formatted result message clears
  // 80 KB of text (~20 000 estimated tokens), triggering the RAG cap.
  // The URL stays a parseable HTTPS URL so SourceCitationSchema does not
  // filter it out before formatting.
  it("oversized RAG context aborts the second round with terminal SSE error", async () => {
    const HUGE_LABEL = "L".repeat(5000);
    const HUGE_URL = `https://example.com/${"u".repeat(5000)}`;
    const source = await prisma.chatbotCorpusSource.create({
      data: {
        name: "Bloated source",
        version: "v01",
        sourceType: CorpusSourceType.PDF,
        scope: CorpusSourceScope.GLOBAL,
        status: CorpusSourceStatus.ACTIVE,
        activatedAt: new Date(),
        citeLabel: HUGE_LABEL,
        citeUrl: HUGE_URL,
      },
    });
    const contents = Array.from(
      { length: 8 },
      (_, i) => `Contenido ${i} sobre alcance y factor de emisión.`
    );
    const embeddingProvider = getEmbeddingProvider();
    const { vectors } = await embeddingProvider.embed(contents);
    const toVectorLiteral = (v: number[]): string => `[${v.join(",")}]`;
    for (let i = 0; i < 8; i++) {
      await prisma.$executeRaw`
        INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
        VALUES (${source.id}, ${i}, ${contents[i]}, ${toVectorLiteral(vectors[i])}::vector)
      `;
    }

    const { status, events } = await collectSseEvents(
      app,
      "/api/chatbot/message",
      { content: "explicame los alcances" },
      { ownsApp: false }
    );

    expect(status).toBe(200);
    // Terminal SSE error event, no `done` event.
    const errorEvents = events.filter((e) => e.event === "error");
    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0].data).toMatchObject({
      code: "EXTERNAL_SERVICE_ERROR",
      message: CHATBOT_GENERIC_ERROR_MESSAGE,
    });
    expect(events.filter((e) => e.event === "done")).toHaveLength(0);

    // Spec: assistant row SHALL be marked `truncated = true` via the
    // disconnect-finalizer path.
    const assistantRow = await prisma.chatbotChatMessage.findFirst({
      where: { role: ChatMessageRole.ASSISTANT },
      orderBy: { id: "desc" },
    });
    expect(assistantRow).not.toBeNull();
    expect(assistantRow!.truncated).toBe(true);
  });

  // Maps to spec scenarios in chatbot-message-streaming:
  //  - "tokens_used on a non-tool turn equals inputTokens + outputTokens
  //     (foundation contract regression guard)"
  //  - "tokens_used on a tool turn uses the SECOND usage event"
  //  - "tokens_used matches the done payload's inputTokens + outputTokens"
  //
  // Sub-case (a) — non-tool turn — guards the foundation contract (the
  // shipped foundation handler persisted only outputTokens, dropping
  // inputTokens silently). Sub-case (b) — tool turn — guards the
  // RAG-MVP-specific rule that tokens_used reflects the SECOND (terminal)
  // usage event only, NOT a sum across both rounds. A previous handler
  // implementation summed round1+round2 and was paired with a mock that
  // emitted a stale round1 usage event after tool_call; both were fixed
  // together in this change.
  it("tokens_used on the assistant row equals inputTokens + outputTokens", async () => {
    // ---- Sub-case (a): non-tool turn -------------------------------------
    // "mensaje cualquiera de prueba" matches no mock routing cue (neither
    // TOOL_CALL_KEYWORDS nor platformCues), so the eco-template path runs
    // and no tool round is triggered. The mock's `usage` event reports
    // `inputTokens = estimateTokens(joinedInput)` and
    // `outputTokens = estimateTokens(output)` — both non-zero — so the
    // strict-greater-than guard below is meaningful.
    const seedA = await collectSseEvents(
      app,
      "/api/chatbot/message",
      { content: "mensaje cualquiera de prueba" },
      { ownsApp: false }
    );
    expect(seedA.status).toBe(200);
    const doneEventsA = seedA.events.filter((e) => e.event === "done");
    expect(doneEventsA).toHaveLength(1);
    const doneA = doneEventsA[0].data as DoneEventData;

    const rowA = await prisma.chatbotChatMessage.findFirst({
      where: { role: ChatMessageRole.ASSISTANT },
      orderBy: { id: "desc" },
    });
    expect(rowA).not.toBeNull();
    expect(rowA!.tokensUsed).toBe(doneA.inputTokens + doneA.outputTokens);
    // Defensive guard: the foundation regression was outputTokens-only
    // persistence. tokens_used MUST be strictly greater than that value
    // when inputTokens > 0 (which it always is on a successful turn).
    expect(rowA!.tokensUsed).toBeGreaterThan(doneA.outputTokens);

    // Reset for sub-case (b). The suite-level beforeEach does not fire
    // between sub-cases of the same `it` block, so we clean up explicitly.
    await prisma.chatbotChatConversation.deleteMany({});
    await prisma.chatbotCorpusChunk.deleteMany({});
    await prisma.chatbotCorpusSource.deleteMany({});

    // ---- Sub-case (b): tool turn -----------------------------------------
    // Seed one ACTIVE source with one valid chunk so the tool round
    // completes the happy K=1 path. The "explicame los alcances..." prompt
    // triggers the mock's keyword detection → tool_call → tool execution →
    // second-round delta+usage. Per the spec, only the SECOND round's
    // usage event populates tokens_used.
    const source = await prisma.chatbotCorpusSource.create({
      data: {
        name: "GHG Protocol Corporate Standard",
        version: "v05",
        sourceType: CorpusSourceType.PDF,
        scope: CorpusSourceScope.GLOBAL,
        status: CorpusSourceStatus.ACTIVE,
        activatedAt: new Date(),
        citeLabel: "GHG Protocol §2.3",
        citeUrl: "https://ghgprotocol.org/corporate-standard",
      },
    });
    const CONTENT =
      "Las emisiones de alcance 1 son emisiones directas de fuentes propias.";
    const embeddingProvider = getEmbeddingProvider();
    const { vectors } = await embeddingProvider.embed([CONTENT]);
    const toVectorLiteral = (v: number[]): string => `[${v.join(",")}]`;
    await prisma.$executeRaw`
      INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
      VALUES (${source.id}, 0, ${CONTENT}, ${toVectorLiteral(vectors[0])}::vector)
    `;

    const seedB = await collectSseEvents(
      app,
      "/api/chatbot/message",
      { content: "explicame los alcances 1, 2 y 3" },
      { ownsApp: false }
    );
    expect(seedB.status).toBe(200);
    const doneEventsB = seedB.events.filter((e) => e.event === "done");
    expect(doneEventsB).toHaveLength(1);
    const doneB = doneEventsB[0].data as DoneEventData;

    const rowB = await prisma.chatbotChatMessage.findFirst({
      where: { role: ChatMessageRole.ASSISTANT },
      orderBy: { id: "desc" },
    });
    expect(rowB).not.toBeNull();
    // SECOND-round inputTokens + outputTokens — the values emitted on the
    // wire as `done.inputTokens`/`done.outputTokens` come from the
    // terminal usage event (the second round's), so the wire and the
    // persisted value cannot drift. A regression to the previous
    // sum-across-rounds behavior would inflate tokens_used above the
    // wire-emitted sum and fail this assertion.
    expect(rowB!.tokensUsed).toBe(doneB.inputTokens + doneB.outputTokens);
    // Strictly greater than output-tokens-only — guards the
    // foundation-era regression where only outputTokens was persisted.
    expect(rowB!.tokensUsed).toBeGreaterThan(doneB.outputTokens);
  });

  // Maps to chatbot-message-streaming spec scenario "Modo B response does
  // not invoke searchKnowledge":
  //   THEN the LLM SHALL classify the turn as Modo B and SHALL NOT emit
  //   a tool_call event for searchKnowledge; the assistant turn SHALL
  //   contain (and start with) the platform-redirect literal defined in
  //   item 4 of the system-prompt requirement.
  //
  // Three sub-cases of platform-usage phrasings to assert the
  // classification is robust, not over-fit to a single wording. Against
  // the mock provider, isPlatformQuery() detects the platform cues
  // ("cómo creo", "dónde veo", "cómo invito") and yields the redirect
  // literal directly as deltas instead of a tool_call — so the handler's
  // peek lands on a delta, takes the non-tool path, and never invokes
  // executeSearchKnowledgeTool. The spy is the regression guard against
  // a future implementation that calls the tool despite no upstream
  // tool_call event.
  const PLATFORM_REDIRECT_LITERAL =
    "Esa pregunta corresponde al uso de la plataforma Huella Latam. Esa funcionalidad estará disponible en una próxima versión del asistente; por ahora puedo ayudarte con preguntas sobre metodología de huella de carbono.";

  const PLATFORM_PHRASINGS = [
    "¿cómo creo un inventario?",
    "¿dónde veo los reportes?",
    "¿cómo invito a un colega?",
  ] as const;

  it.each(PLATFORM_PHRASINGS)(
    "Modo B platform question does NOT invoke searchKnowledge and responds with redirect literal: %s",
    async (phrasing) => {
      const executeToolSpy = vi.spyOn(
        searchKnowledgeTools,
        "executeSearchKnowledgeTool"
      );

      const { status, events } = await collectSseEvents(
        app,
        "/api/chatbot/message",
        { content: phrasing },
        { ownsApp: false }
      );

      expect(status).toBe(200);

      // (a) Zero tool_call events leaked to the SSE wire AND the
      // server-side spy confirms executeSearchKnowledgeTool was never
      // invoked. Both checks are required by the task; the spy guards
      // against an implementation drift where the handler calls the tool
      // without a tool_call event upstream (which would be a spec bug).
      expect(events.filter((e) => e.event === "tool_call")).toHaveLength(0);
      expect(executeToolSpy).not.toHaveBeenCalled();

      // (b) Assistant content CONTAINS AND STARTS WITH the redirect
      // literal byte-for-byte. The spec scenario asserts both verbs:
      // "the assistant turn SHALL contain (and start with) the
      // platform-redirect literal". Against the mock the deltas join
      // to exactly the literal, so both assertions trivially pass —
      // they catch a regression that pads the response with leading
      // tokens or paraphrases the redirect.
      const deltas = events.filter((e) => !e.event);
      const assistantContent = deltas
        .map((e) => (e.data as { content: string }).content)
        .join("");
      expect(assistantContent).toContain(PLATFORM_REDIRECT_LITERAL);
      expect(assistantContent.startsWith(PLATFORM_REDIRECT_LITERAL)).toBe(true);

      // (c) Assistant row's sources_cited is the empty array. The
      // non-tool path never pushes into finalSources, so the persisted
      // JSONB defaults to [] from the schema default.
      const assistantRow = await prisma.chatbotChatMessage.findFirst({
        where: { role: ChatMessageRole.ASSISTANT },
        orderBy: { id: "desc" },
      });
      expect(assistantRow).not.toBeNull();
      expect(assistantRow!.sourcesCited).toEqual([]);

      // (d) The done event payload entirely omits the `sources` field.
      // The handler's optional-field-when-non-empty contract means the
      // key never reaches the wire when finalSources is empty.
      const doneEvents = events.filter((e) => e.event === "done");
      expect(doneEvents).toHaveLength(1);
      expect(doneEvents[0].data).not.toHaveProperty("sources");
    }
  );

  // Maps to chatbot-message-streaming spec scenario "Modo C response does
  // not invoke searchKnowledge or open with the K=0 literal":
  //   THEN the LLM SHALL classify the turn as Modo C and SHALL NOT emit a
  //   tool_call event; the assistant turn SHALL be a brief, natural Spanish
  //   response that does NOT start with the K=0 opener and does NOT
  //   contain the platform-redirect literal — those wordings are reserved
  //   for Modo A's no-source path and Modo B respectively.
  //
  // Sub-case (a) only: plain conversational ("gracias", "¿cómo estás?").
  // Neither matches a tool keyword nor a platform cue in the mock, so the
  // eco-template fallback fires — non-empty Spanish prose, no tool_call,
  // no K=0 opener, no redirect literal. The Modo C welcome sub-case (b)
  // is intentionally NOT implemented against the mock here; see the
  // checkpoint report on its handling.
  const K0_OPENER =
    "No dispongo de fuentes verificadas en mi corpus para responder esto con precisión.";

  const PLAIN_CONVERSATIONAL = ["gracias", "¿cómo estás?"] as const;

  it.each(PLAIN_CONVERSATIONAL)(
    "Modo C plain conversational does NOT invoke searchKnowledge and does NOT use opener/redirect: %s",
    async (phrasing) => {
      const { status, events } = await collectSseEvents(
        app,
        "/api/chatbot/message",
        { content: phrasing },
        { ownsApp: false }
      );

      expect(status).toBe(200);
      // No tool_call event leaked to the wire.
      expect(events.filter((e) => e.event === "tool_call")).toHaveLength(0);

      const deltas = events.filter((e) => !e.event);
      const assistantContent = deltas
        .map((e) => (e.data as { content: string }).content)
        .join("");

      // Non-empty Spanish prose. The eco-template fallback yields
      // "Recibí: <phrasing>. Esta es una respuesta de mock." against the
      // mock — non-empty by construction.
      expect(assistantContent.length).toBeGreaterThan(0);
      // SHALL NOT start with the K=0 opener (reserved for Modo A no-source
      // path) and SHALL NOT contain the Modo B redirect literal.
      expect(assistantContent.startsWith(K0_OPENER)).toBe(false);
      expect(assistantContent).not.toContain(PLATFORM_REDIRECT_LITERAL);
    }
  );

  // 10.36(b) uses vi.spyOn to make the mock emit a hardcoded welcome
  // string. The test validates handler/wire/DB plumbing for Modo C
  // welcome turns (no tool invocation, no K=0 opener, no Modo B
  // redirect literal, capability + roadmap content shape, 2-6 sentence
  // window), NOT that the real LLM with the system prompt produces a
  // valid welcome. The latter lives in Bloque E (smoke E2E task 12.4
  // run against Azure OpenAI with the real prompt).
  //
  // Cross-reference: 10.35 uses the same pattern for Modo B redirect
  // (the mock's isPlatformQuery() is a hardcoded fixture, not a real
  // classifier). Both 10.35 and 10.36(b) are structural plumbing
  // guards, not semantic validators — the mock cannot pretend to do
  // what a real LLM does with the system prompt, and we don't try.
  const METHODOLOGY_KEYWORDS = [
    "metodología",
    "huella de carbono",
    "alcances",
    "factores de emisión",
  ] as const;

  const ROADMAP_PHRASES = [
    "próxima versión",
    "próximas versiones",
    "próximamente",
  ] as const;

  // 4 sentences, contains 4 of the 4 methodology keywords and 2 of the
  // 3 roadmap phrases — robust against a future cosmetic edit that
  // removes any single keyword/phrase. Sits in the middle of the
  // sentence-count window (2-6) so adding or removing one sentence
  // doesn't break the bound.
  const STUBBED_WELCOME =
    "¡Hola! Soy el Asistente de Huella Latam y en esta versión inicial puedo responder preguntas sobre metodología de huella de carbono y los alcances 1, 2 y 3, citando fuentes verificadas como GHG Protocol. La guía sobre el uso de la plataforma y la medición asistida llegarán en una próxima versión; próximamente también ampliaré el corpus. ¿Querés hacerme una pregunta sobre metodología o factores de emisión?";

  const WELCOME_PHRASINGS = ["hola", "¿qué puedes hacer?", "ayuda"] as const;

  it.each(WELCOME_PHRASINGS)(
    "Modo C welcome covers capabilities and roadmap: %s",
    async (phrasing) => {
      vi.spyOn(mockProvider, "streamCompletion").mockImplementation(
        async function* () {
          await Promise.resolve();
          yield { type: "delta", content: STUBBED_WELCOME };
          yield { type: "usage", inputTokens: 30, outputTokens: 70 };
        }
      );

      const { status, events } = await collectSseEvents(
        app,
        "/api/chatbot/message",
        { content: phrasing },
        { ownsApp: false }
      );

      expect(status).toBe(200);

      // (i) Zero tool_call events leaked to the SSE wire.
      expect(events.filter((e) => e.event === "tool_call")).toHaveLength(0);

      const deltas = events.filter((e) => !e.event);
      const assistantContent = deltas
        .map((e) => (e.data as { content: string }).content)
        .join("");

      // (ii) Does NOT start with the K=0 opener and does NOT contain
      // the Modo B redirect literal.
      expect(assistantContent.startsWith(K0_OPENER)).toBe(false);
      expect(assistantContent).not.toContain(PLATFORM_REDIRECT_LITERAL);

      // (iii) At least one methodology keyword present (case-insensitive
      // per the spec scenario "Modo C welcome response covers capabilities
      // and roadmap"). The stubbed welcome carries four of four, so a
      // single refactor that removes one keyword does not break this
      // assertion.
      const lowerContent = assistantContent.toLowerCase();
      const hasMethodologyKeyword = METHODOLOGY_KEYWORDS.some((kw) =>
        lowerContent.includes(kw.toLowerCase())
      );
      expect(hasMethodologyKeyword).toBe(true);

      // (iv) At least one roadmap phrase present (case-insensitive). The
      // stubbed welcome carries two of three.
      const hasRoadmapPhrase = ROADMAP_PHRASES.some((phrase) =>
        lowerContent.includes(phrase.toLowerCase())
      );
      expect(hasRoadmapPhrase).toBe(true);

      // (v) Response is between 2 and 6 sentences inclusive. Per the
      // task: count `.`, `!`, `?` as sentence terminators excluding
      // URL/decimal cases. The stubbed welcome has no URLs and no
      // decimal numbers (uses "1, 2 y 3"), so a flat regex over the
      // three punctuation marks is faithful to the contract.
      const sentenceCount = (assistantContent.match(/[.!?]/g) ?? []).length;
      expect(sentenceCount).toBeGreaterThanOrEqual(2);
      expect(sentenceCount).toBeLessThanOrEqual(6);
    }
  );

  // Maps to chatbot-message-streaming spec scenario "Modo C off-domain
  // redirect":
  //   THEN the LLM SHALL classify the turn as Modo C sub-modo C.1 and
  //   SHALL NOT emit a tool_call event; the assistant turn SHALL be
  //   byte-for-byte exactly the off-domain redirect literal; the
  //   assistant row's sources_cited SHALL be the empty array and the
  //   done payload SHALL NOT include a sources field.
  //
  // The product motivation is documented in design.md / proposal: the V1
  // Educar bot is NOT a generalist assistant and must redirect factual
  // off-domain questions instead of answering them like ChatGPT. The mock
  // exercises this by routing on hardcoded fixtures (marte, 2+2, clima
  // en santiago, mundial, messi, población) that do not appear in any
  // Modo A keyword, Modo B platform cue, or Modo C.2 welcome / plain
  // conversational cue — so the off-domain branch fires last in the
  // mock's classification order without false-positives on welcome turns.
  const OFF_DOMAIN_REDIRECT_LITERAL =
    "Solo puedo ayudarte con preguntas sobre metodología de huella de carbono, factores de emisión, los alcances 1, 2 y 3, y el uso de la plataforma Huella Latam. ¿En qué de esos temas te puedo ayudar?";

  const OFF_DOMAIN_PHRASINGS = [
    "¿cuál es la población de Marte?",
    "¿cuánto es 2+2?",
    "¿cómo está el clima en Santiago?",
  ] as const;

  it.each(OFF_DOMAIN_PHRASINGS)(
    "Modo C off-domain redirect does NOT invoke searchKnowledge and responds with off-domain literal: %s",
    async (phrasing) => {
      const executeToolSpy = vi.spyOn(
        searchKnowledgeTools,
        "executeSearchKnowledgeTool"
      );

      const { status, events } = await collectSseEvents(
        app,
        "/api/chatbot/message",
        { content: phrasing },
        { ownsApp: false }
      );

      expect(status).toBe(200);

      // Zero tool_call events leaked to the SSE wire AND the server-side
      // spy confirms executeSearchKnowledgeTool was never invoked. The
      // off-domain branch in the mock is positioned AFTER the tool-keyword
      // check, so a defensive regression that drops the off-domain fixture
      // into the tool-keyword list would surface here.
      expect(events.filter((e) => e.event === "tool_call")).toHaveLength(0);
      expect(executeToolSpy).not.toHaveBeenCalled();

      // Byte-for-byte equality of the joined deltas. The mock yields the
      // literal via splitIntoChunks(_, 3), so the joined content matches
      // the source string exactly — any paraphrase, padding, or trailing
      // whitespace fails this assertion.
      const deltas = events.filter((e) => !e.event);
      const assistantContent = deltas
        .map((e) => (e.data as { content: string }).content)
        .join("");
      expect(assistantContent).toBe(OFF_DOMAIN_REDIRECT_LITERAL);

      // Persistence: sources_cited defaults to the empty array on the
      // non-tool path (handler never pushes into finalSources).
      const assistantRow = await prisma.chatbotChatMessage.findFirst({
        where: { role: ChatMessageRole.ASSISTANT },
        orderBy: { id: "desc" },
      });
      expect(assistantRow).not.toBeNull();
      expect(assistantRow!.sourcesCited).toEqual([]);

      // Wire: done payload omits the `sources` field entirely (matches
      // the K=0 / non-tool convention — present-and-empty would be
      // a contract drift).
      const doneEvents = events.filter((e) => e.event === "done");
      expect(doneEvents).toHaveLength(1);
      expect(doneEvents[0].data).not.toHaveProperty("sources");
    }
  );
});
