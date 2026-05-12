import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
} from "vitest";
import { PrismaClient, generatePrismaAdapter } from "@repo/database";
import {
  CorpusSourceScope,
  CorpusSourceStatus,
  CorpusSourceType,
} from "@repo/database/enums";
import { searchKnowledge } from "@/features/chatbot/searchKnowledge/index.js";
import { getEmbeddingProvider } from "@/features/chatbot/embeddingProvider/index.js";

describe("searchKnowledge — integration", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    const databaseUrl = inject("databaseUrl");
    prisma = new PrismaClient({
      adapter: generatePrismaAdapter(databaseUrl),
    });
  });

  afterAll(async () => {
    await prisma.chatbotCorpusChunk.deleteMany({});
    await prisma.chatbotCorpusSource.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.chatbotCorpusChunk.deleteMany({});
    await prisma.chatbotCorpusSource.deleteMany({});
  });

  // Maps to the chatbot-corpus-retrieval CRITICAL release-gate invariant:
  // "Retrieval always filters on chatbot_corpus_source.status = 'ACTIVE'".
  // The OUTDATED chunk's content is identical to the query, so the mock
  // SHA-256 embedding is byte-equal — cosine distance 0, similarity 1.0
  // (maximum). The test passes only if the status filter excludes it
  // regardless of similarity.
  it("excludes OUTDATED and DRAFT sources from results", async () => {
    const QUERY = "consulta sobre alcance 1 y factor de emision";
    const ACTIVE_CONTENT = "contenido del chunk activo sobre proceso";
    const DRAFT_CONTENT = "contenido del chunk borrador, no listo";
    const OUTDATED_CONTENT = QUERY;

    const [draftSource, activeSource, outdatedSource] = await Promise.all([
      prisma.chatbotCorpusSource.create({
        data: {
          name: "DraftSource",
          version: "v01",
          sourceType: CorpusSourceType.PDF,
          scope: CorpusSourceScope.GLOBAL,
          status: CorpusSourceStatus.DRAFT,
          citeLabel: "DRAFT label",
          citeUrl: "https://example.com/draft",
        },
      }),
      prisma.chatbotCorpusSource.create({
        data: {
          name: "ActiveSource",
          version: "v01",
          sourceType: CorpusSourceType.PDF,
          scope: CorpusSourceScope.GLOBAL,
          status: CorpusSourceStatus.ACTIVE,
          activatedAt: new Date(),
          citeLabel: "ACTIVE label",
          citeUrl: "https://example.com/active",
        },
      }),
      prisma.chatbotCorpusSource.create({
        data: {
          name: "OutdatedSource",
          version: "v01",
          sourceType: CorpusSourceType.PDF,
          scope: CorpusSourceScope.GLOBAL,
          status: CorpusSourceStatus.OUTDATED,
          activatedAt: new Date(Date.now() - 60 * 60 * 1000),
          deactivatedAt: new Date(),
          citeLabel: "OUTDATED label",
          citeUrl: "https://example.com/outdated",
        },
      }),
    ]);

    const embeddingProvider = getEmbeddingProvider();
    const { vectors } = await embeddingProvider.embed([
      DRAFT_CONTENT,
      ACTIVE_CONTENT,
      OUTDATED_CONTENT,
    ]);
    const toVectorLiteral = (v: number[]): string => `[${v.join(",")}]`;

    await prisma.$executeRaw`
      INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
      VALUES (${draftSource.id}, 0, ${DRAFT_CONTENT}, ${toVectorLiteral(vectors[0])}::vector)
    `;
    await prisma.$executeRaw`
      INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
      VALUES (${activeSource.id}, 0, ${ACTIVE_CONTENT}, ${toVectorLiteral(vectors[1])}::vector)
    `;
    await prisma.$executeRaw`
      INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
      VALUES (${outdatedSource.id}, 0, ${OUTDATED_CONTENT}, ${toVectorLiteral(vectors[2])}::vector)
    `;

    const results = await searchKnowledge(prisma, QUERY);

    expect(results).toHaveLength(1);
    expect(results[0].source_id).toBe(activeSource.id);
    expect(results[0].content).toBe(ACTIVE_CONTENT);
    expect(results[0].cite_label).toBe("ACTIVE label");
    expect(results[0].cite_url).toBe("https://example.com/active");
  });
});
