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
import { PrismaClient, generatePrismaAdapter } from "@repo/database";
import {
  CorpusSourceScope,
  CorpusSourceStatus,
  CorpusSourceType,
} from "@repo/database/enums";
import {
  searchKnowledge,
  InvalidQueryError,
} from "@/features/chatbot/searchKnowledge/index.js";
import { getEmbeddingProvider } from "@/features/chatbot/embeddingProvider/index.js";
import {
  MOCK_MODEL_NAME,
  mockEmbeddingProvider,
} from "@/features/chatbot/embeddingProvider/mock.js";

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

  afterEach(() => {
    // Restore vi.spyOn'd methods (mockEmbeddingProvider.embed, prisma
    // method spies) so a stub in one test doesn't leak into the next.
    vi.restoreAllMocks();
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
          embeddingModel: MOCK_MODEL_NAME,
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
          embeddingModel: MOCK_MODEL_NAME,
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
          embeddingModel: MOCK_MODEL_NAME,
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

  it("excludes sources embedded by a different model", async () => {
    // Cosine distance across two embedding spaces still RANKS, so a mismatch
    // is answered confidently from noise instead of failing. Reachable via a
    // corpus ingested with the mock provider and queried with azure-openai, or
    // mid-way through a re-embed. The chunk content equals the query, so its
    // mock embedding is byte-equal (similarity 1.0): the test passes only if
    // the model filter excludes it regardless of similarity.
    const QUERY = "consulta sobre limites operacionales";

    const [matching, foreign] = await Promise.all([
      prisma.chatbotCorpusSource.create({
        data: {
          embeddingModel: MOCK_MODEL_NAME,
          name: "MatchingModelSource",
          version: "v01",
          sourceType: CorpusSourceType.PDF,
          scope: CorpusSourceScope.GLOBAL,
          status: CorpusSourceStatus.ACTIVE,
          activatedAt: new Date(),
          citeLabel: "Matching label",
          citeUrl: "https://example.com/matching",
        },
      }),
      prisma.chatbotCorpusSource.create({
        data: {
          embeddingModel: "text-embedding-3-large",
          name: "ForeignModelSource",
          version: "v01",
          sourceType: CorpusSourceType.PDF,
          scope: CorpusSourceScope.GLOBAL,
          status: CorpusSourceStatus.ACTIVE,
          activatedAt: new Date(),
          citeLabel: "Foreign label",
          citeUrl: "https://example.com/foreign",
        },
      }),
    ]);

    const embeddingProvider = getEmbeddingProvider();
    const { vectors } = await embeddingProvider.embed([
      "contenido lejano a la consulta",
      QUERY,
    ]);
    const toVectorLiteral = (v: number[]): string => `[${v.join(",")}]`;

    await prisma.$executeRaw`
      INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
      VALUES (${matching.id}, 0, ${"contenido lejano a la consulta"}, ${toVectorLiteral(vectors[0])}::vector)
    `;
    await prisma.$executeRaw`
      INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
      VALUES (${foreign.id}, 0, ${QUERY}, ${toVectorLiteral(vectors[1])}::vector)
    `;

    const results = await searchKnowledge(prisma, QUERY);

    expect(results).toHaveLength(1);
    expect(results[0].source_id).toBe(matching.id);
  });

  it("returns nothing when every source carries a NULL embedding model", async () => {
    // Unknown provenance is not a match. The ingest CLI always records the
    // model, so this only covers rows written outside it.
    const QUERY = "consulta sin procedencia conocida";
    const source = await prisma.chatbotCorpusSource.create({
      data: {
        name: "UnknownProvenanceSource",
        version: "v01",
        sourceType: CorpusSourceType.PDF,
        scope: CorpusSourceScope.GLOBAL,
        status: CorpusSourceStatus.ACTIVE,
        activatedAt: new Date(),
        citeLabel: "Unknown label",
        citeUrl: "https://example.com/unknown",
      },
    });

    const { vectors } = await getEmbeddingProvider().embed([QUERY]);
    await prisma.$executeRaw`
      INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
      VALUES (${source.id}, 0, ${QUERY}, ${`[${vectors[0].join(",")}]`}::vector)
    `;

    expect(await searchKnowledge(prisma, QUERY)).toHaveLength(0);
  });

  // Maps to chatbot-corpus-retrieval spec requirement
  // "searchKnowledge applies optional scope and sourceType filters":
  //   when the caller passes `scope` or `sourceType` (or both), the
  //   result set SHALL be restricted to chunks under sources matching
  //   the filters; status=ACTIVE is always enforced regardless.
  //
  // Seeds 4 ACTIVE sources × 1 chunk each across the (scope,
  // sourceType) cross-product the spec exposes via SearchKnowledgeOptions
  // (GLOBAL/NATIONAL × PDF/MD/URL), then queries with three filter
  // combinations covering single-axis and combined filtering.
  it("scope and sourceType filters restrict results", async () => {
    const seedSource = async (
      suffix: string,
      opts: {
        scope: CorpusSourceScope;
        sourceType: CorpusSourceType;
      }
    ) =>
      prisma.chatbotCorpusSource.create({
        data: {
          embeddingModel: MOCK_MODEL_NAME,
          name: `Source-${suffix}`,
          version: "v01",
          sourceType: opts.sourceType,
          scope: opts.scope,
          status: CorpusSourceStatus.ACTIVE,
          activatedAt: new Date(),
          citeLabel: `Label ${suffix}`,
          citeUrl: `https://example.com/${suffix}`,
        },
      });

    const [globalPdf, nationalPdf, globalMd, nationalUrl] = await Promise.all([
      seedSource("global-pdf", {
        scope: CorpusSourceScope.GLOBAL,
        sourceType: CorpusSourceType.PDF,
      }),
      seedSource("national-pdf", {
        scope: CorpusSourceScope.NATIONAL,
        sourceType: CorpusSourceType.PDF,
      }),
      seedSource("global-md", {
        scope: CorpusSourceScope.GLOBAL,
        sourceType: CorpusSourceType.MD,
      }),
      seedSource("national-url", {
        scope: CorpusSourceScope.NATIONAL,
        sourceType: CorpusSourceType.URL,
      }),
    ]);

    const contents = [
      "Contenido global PDF sobre alcance 1.",
      "Contenido national PDF sobre alcance 2.",
      "Contenido global MD sobre factores de emisión.",
      "Contenido national URL sobre normativa.",
    ];
    const embeddingProvider = getEmbeddingProvider();
    const { vectors } = await embeddingProvider.embed(contents);
    const toVectorLiteral = (v: number[]): string => `[${v.join(",")}]`;
    const seededIds = [
      globalPdf.id,
      nationalPdf.id,
      globalMd.id,
      nationalUrl.id,
    ];
    for (let i = 0; i < seededIds.length; i++) {
      await prisma.$executeRaw`
        INSERT INTO chatbot_corpus_chunk (source_id, chunk_index, content, embedding)
        VALUES (${seededIds[i]}, 0, ${contents[i]}, ${toVectorLiteral(vectors[i])}::vector)
      `;
    }

    const QUERY = "consulta general sobre el corpus";

    // No filter → all 4 chunks return.
    const noFilter = await searchKnowledge(prisma, QUERY);
    expect(new Set(noFilter.map((r) => r.source_id))).toEqual(
      new Set(seededIds)
    );

    // scope=GLOBAL only → globalPdf + globalMd.
    const onlyGlobal = await searchKnowledge(prisma, QUERY, {
      scope: CorpusSourceScope.GLOBAL,
    });
    expect(new Set(onlyGlobal.map((r) => r.source_id))).toEqual(
      new Set([globalPdf.id, globalMd.id])
    );

    // sourceType=PDF only → globalPdf + nationalPdf.
    const onlyPdf = await searchKnowledge(prisma, QUERY, {
      sourceType: CorpusSourceType.PDF,
    });
    expect(new Set(onlyPdf.map((r) => r.source_id))).toEqual(
      new Set([globalPdf.id, nationalPdf.id])
    );

    // scope=GLOBAL AND sourceType=PDF → globalPdf only. Validates the
    // combined-filter path is AND-composed, not OR.
    const both = await searchKnowledge(prisma, QUERY, {
      scope: CorpusSourceScope.GLOBAL,
      sourceType: CorpusSourceType.PDF,
    });
    expect(both.map((r) => r.source_id)).toEqual([globalPdf.id]);
  });

  // Maps to chatbot-corpus-retrieval spec requirement
  // "searchKnowledge validates input":
  //   empty or whitespace-only query SHALL throw InvalidQueryError.
  //
  // Two sub-cases: literal empty string and whitespace-only. Both
  // resolve to `trimmed.length === 0` inside validateQuery and throw
  // synchronously before any side-effects.
  it("empty query throws InvalidQueryError", async () => {
    await expect(searchKnowledge(prisma, "")).rejects.toBeInstanceOf(
      InvalidQueryError
    );
    await expect(searchKnowledge(prisma, "   ")).rejects.toBeInstanceOf(
      InvalidQueryError
    );
  });

  // Maps to chatbot-corpus-retrieval spec requirement:
  //   topK outside [1, 20] SHALL throw InvalidQueryError.
  //
  // Two sub-cases: topK=0 (below min) and topK=21 (above max). Both
  // are valid integers, so the integer check passes and the range
  // check fires. The error message lists the explicit bound interval
  // so the caller can correct the value.
  it("out-of-range topK throws InvalidQueryError", async () => {
    await expect(
      searchKnowledge(prisma, "consulta válida", { topK: 0 })
    ).rejects.toBeInstanceOf(InvalidQueryError);
    await expect(
      searchKnowledge(prisma, "consulta válida", { topK: 21 })
    ).rejects.toBeInstanceOf(InvalidQueryError);
  });

  // Maps to chatbot-corpus-retrieval spec requirement
  // "Query token cap":
  //   a query whose estimateTokens > 512 SHALL throw InvalidQueryError
  //   AND SHALL NOT invoke the embedding provider OR execute SQL.
  //
  // estimateTokens uses ceil(text.length / 4). 2049 characters →
  // ceil(2049/4) = 513 tokens, which is the smallest length that
  // crosses the 512-token cap. The spies confirm the reject fires
  // pre-side-effect (validateQuery throws BEFORE the embedding factory
  // is touched, BEFORE prisma.$queryRaw fires).
  it("oversized query is rejected with InvalidQueryError before embedding/SQL side-effects", async () => {
    // Spy on the cached singleton's embed method. The factory caches
    // mockEmbeddingProvider on first call; subsequent calls return the
    // same reference, so a spy on the reference is visible to
    // searchKnowledge when it invokes getEmbeddingProvider().embed(...).
    const embedSpy = vi.spyOn(mockEmbeddingProvider, "embed");
    // Stub prisma instead of spying on the real client: Prisma 7's
    // Proxy-based client surfaces $queryRaw via a get trap rather than
    // a direct property, so vi.spyOn(prisma, "$queryRaw") fails with
    // "Received undefined". searchKnowledge only touches the passed-in
    // prisma reference (no global DB state), so the stub is
    // functionally equivalent for verifying "SQL was not executed".
    const queryRawStub = vi.fn();
    const stubPrisma = { $queryRaw: queryRawStub } as unknown as PrismaClient;

    const OVERSIZED = "a".repeat(2049);
    await expect(searchKnowledge(stubPrisma, OVERSIZED)).rejects.toBeInstanceOf(
      InvalidQueryError
    );

    // Embedding provider was NOT called — validateQuery threw first.
    expect(embedSpy).not.toHaveBeenCalled();
    // prisma.$queryRaw was NOT executed — the function never reached
    // the SQL branch. The cap enforcement is BEFORE the side-effects,
    // not after a tentative round-trip.
    expect(queryRawStub).not.toHaveBeenCalled();
  });

  // Maps to chatbot-corpus-retrieval spec requirement:
  //   non-integer topK SHALL throw InvalidQueryError; SQL SHALL NOT
  //   be executed.
  //
  // Two sub-cases:
  //   - topK = 3.5 hits the integer check ("topK must be an integer")
  //   - topK = -1 is an integer but below the range bound, hits the
  //     range check ("topK must be in [1, 20]")
  // Both throw before any embedding or SQL side-effect.
  it("fails with a diagnosable message when the provider returns no vector", async () => {
    // formatVectorLiteral would otherwise throw "vector is not iterable" from
    // inside itself, and the handler maps that to a generic 503 that names
    // neither the provider nor the empty batch.
    vi.spyOn(mockEmbeddingProvider, "embed").mockResolvedValue({
      vectors: [],
      inputTokens: 4,
      model: MOCK_MODEL_NAME,
    });
    const queryRawStub = vi.fn();
    const stubPrisma = { $queryRaw: queryRawStub } as unknown as PrismaClient;

    await expect(searchKnowledge(stubPrisma, "consulta")).rejects.toThrow(
      /returned 0 vectors for a single query input/
    );
    expect(queryRawStub).not.toHaveBeenCalled();
  });

  it("non-integer topK is rejected with InvalidQueryError before SQL execution", async () => {
    // Same stub-prisma pattern as the oversized-query test above — see
    // that test's comment for the rationale (Prisma 7 Proxy + vi.spyOn
    // incompatibility).
    const embedSpy = vi.spyOn(mockEmbeddingProvider, "embed");
    const queryRawStub = vi.fn();
    const stubPrisma = { $queryRaw: queryRawStub } as unknown as PrismaClient;

    await expect(
      searchKnowledge(stubPrisma, "consulta válida", { topK: 3.5 })
    ).rejects.toBeInstanceOf(InvalidQueryError);
    await expect(
      searchKnowledge(stubPrisma, "consulta válida", { topK: -1 })
    ).rejects.toBeInstanceOf(InvalidQueryError);

    // Both rejected paths fire before either side-effect. validateTopK
    // is the second validation gate (after validateQuery), and both
    // gates throw synchronously before getEmbeddingProvider() and the
    // $queryRaw call.
    expect(embedSpy).not.toHaveBeenCalled();
    expect(queryRawStub).not.toHaveBeenCalled();
  });
});
