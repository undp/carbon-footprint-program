import { describe, it, expect, beforeAll, afterAll, inject } from "vitest";
import { PrismaClient, generatePrismaAdapter } from "@repo/database";
import {
  CorpusSourceScope,
  CorpusSourceStatus,
  CorpusSourceType,
} from "@repo/database/enums";
import { getEmbeddingProvider } from "@/features/chatbot/embeddingProvider/index.js";
import { MOCK_MODEL_NAME } from "@/features/chatbot/embeddingProvider/mock.js";
import { executeSearchKnowledgeTool } from "@/features/chatbot/tools/searchKnowledge/index.js";

describe("executeSearchKnowledgeTool — malformed arguments", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: generatePrismaAdapter(inject("databaseUrl")),
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * Every one of these used to be — or looks like it should be — a lost turn.
   * The tool contract is that a badly-shaped argument degrades to the
   * empty-result fallback, which the system prompt already renders honestly as
   * the K=0 opener. Only a genuine failure (provider down, connection dropped)
   * should be allowed to end the turn.
   */
  it("degrades an over-long query to the empty result instead of throwing", async () => {
    // searchKnowledge refuses past QUERY_TOKEN_LIMIT (512 tokens ≈ 2048 chars).
    // The tool schema advertises maxLength 2000, but that is a hint the model
    // is free to ignore — and when it did, InvalidQueryError escaped here, hit
    // the handler's catch, and answered 503.
    const args = JSON.stringify({ query: "a".repeat(4000) });

    const result = await executeSearchKnowledgeTool(prisma, args);

    expect(result.validSources).toEqual([]);
    expect(result.chunks).toEqual([]);
    expect(result.toolResultMessage).toContain("0 fuentes válidas");
  });

  it("degrades an empty query the same way", async () => {
    const result = await executeSearchKnowledgeTool(
      prisma,
      JSON.stringify({ query: "   " })
    );

    expect(result.validSources).toEqual([]);
  });

  it("degrades unparseable JSON", async () => {
    const result = await executeSearchKnowledgeTool(prisma, "{not json");

    expect(result.validSources).toEqual([]);
  });

  it("degrades arguments that do not match the schema", async () => {
    const result = await executeSearchKnowledgeTool(
      prisma,
      JSON.stringify({ wrongField: 1 })
    );

    expect(result.validSources).toEqual([]);
  });
});

/**
 * The tool serves two readers from one chunk, and they need different things:
 * the model reads to answer, the citation panel records where the answer came
 * from. They were served the same 240-character cut until the model's copy was
 * split off — with chunks sized at ~600 tokens, that handed it roughly the
 * first tenth of every passage and the answers came out of the opening
 * sentence, citation attached.
 */
describe("executeSearchKnowledgeTool — what the model reads", () => {
  let prisma: PrismaClient;

  const CHUNK_CONTENT = `Las emisiones de alcance 1 son las directas de fuentes propias o controladas. ${"Detalle operativo del inventario y su verificación. ".repeat(
    8
  )}El dato que cierra este pasaje es la tasa de recuperación.`;

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: generatePrismaAdapter(inject("databaseUrl")),
    });
    const source = await prisma.chatbotCorpusSource.create({
      data: {
        embeddingModel: MOCK_MODEL_NAME,
        name: "Fuente de prueba",
        version: "v01",
        sourceType: CorpusSourceType.PDF,
        scope: CorpusSourceScope.GLOBAL,
        status: CorpusSourceStatus.ACTIVE,
        activatedAt: new Date(),
        citeLabel: "GHG §1.1",
        citeUrl: "https://example.com/ghg",
      },
    });
    const { vectors } = await getEmbeddingProvider().embed([CHUNK_CONTENT]);
    await prisma.$executeRaw`
      INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
      VALUES (${source.id}, 0, ${CHUNK_CONTENT}, ${`[${vectors[0].join(",")}]`}::vector)
    `;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("hands the model the whole chunk, not the citation snippet", async () => {
    const result = await executeSearchKnowledgeTool(
      prisma,
      JSON.stringify({ query: "alcance 1" })
    );

    expect(result.validSources).toHaveLength(1);
    expect(result.toolResultMessage).toContain(CHUNK_CONTENT);
    // The tail a 240-character cut would have removed. Asserting it directly
    // is the point: this is where an answer would have been lost.
    expect(result.toolResultMessage).toContain("tasa de recuperación");
  });

  it("still caps the citation snippet, which is persisted and put on the wire", async () => {
    const result = await executeSearchKnowledgeTool(
      prisma,
      JSON.stringify({ query: "alcance 1" })
    );

    const snippet = result.validSources[0].snippet;
    expect(snippet).toHaveLength(240);
    expect(snippet.endsWith("…")).toBe(true);
    expect(CHUNK_CONTENT.length).toBeGreaterThan(snippet.length);
  });
});
