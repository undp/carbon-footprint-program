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
});
