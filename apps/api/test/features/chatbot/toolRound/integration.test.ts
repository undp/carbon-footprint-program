import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
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
});
