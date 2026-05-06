import type { PrismaClient } from "@repo/database";
import { getEmbeddingProvider } from "@/features/chatbot/embeddingProvider/index.js";
import { estimateTokens } from "@/features/chatbot/llmProvider/estimateTokens.js";
import { InvalidQueryError } from "./errors.js";
import type { ChunkWithMetadata, SearchKnowledgeOptions } from "./types.js";

const DEFAULT_TOP_K = 8;
const TOP_K_MIN = 1;
const TOP_K_MAX = 20;
const QUERY_TOKEN_LIMIT = 512;

const validateTopK = (topK: number | undefined): number => {
  if (topK === undefined) return DEFAULT_TOP_K;
  if (!Number.isInteger(topK)) {
    throw new InvalidQueryError(
      `topK must be an integer; received ${String(topK)}.`
    );
  }
  if (topK < TOP_K_MIN || topK > TOP_K_MAX) {
    throw new InvalidQueryError(
      `topK must be in [${TOP_K_MIN}, ${TOP_K_MAX}]; received ${topK}.`
    );
  }
  return topK;
};

const validateQuery = (query: string): string => {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    throw new InvalidQueryError("query SHALL NOT be empty or whitespace-only.");
  }
  const tokens = estimateTokens(trimmed);
  if (tokens > QUERY_TOKEN_LIMIT) {
    throw new InvalidQueryError(
      `query estimated at ${tokens} tokens exceeds the cap of ${QUERY_TOKEN_LIMIT}.`
    );
  }
  return trimmed;
};

const formatVectorLiteral = (vector: number[]): string => {
  return `[${vector.join(",")}]`;
};

type SearchKnowledgeRow = {
  source_id: bigint;
  chunk_id: bigint;
  cite_label: string | null;
  cite_url: string | null;
  page_number: number | null;
  section_title: string | null;
  content: string;
  similarity: number;
};

export const searchKnowledge = async (
  prisma: PrismaClient,
  query: string,
  options: SearchKnowledgeOptions = {}
): Promise<ChunkWithMetadata[]> => {
  const trimmedQuery = validateQuery(query);
  const topK = validateTopK(options.topK);

  const embeddingProvider = getEmbeddingProvider();
  const { vectors } = await embeddingProvider.embed([trimmedQuery]);
  const queryVector = vectors[0];
  const vectorLiteral = formatVectorLiteral(queryVector);

  const scope = options.scope ?? null;
  const sourceType = options.sourceType ?? null;

  const rows = await prisma.$queryRaw<SearchKnowledgeRow[]>`
    SELECT
      s.id AS source_id,
      c.id AS chunk_id,
      s.cite_label AS cite_label,
      s.cite_url AS cite_url,
      c.page_number AS page_number,
      c.section_title AS section_title,
      c.content AS content,
      (1 - (c.embedding <=> ${vectorLiteral}::vector))::float8 AS similarity
    FROM chatbot_corpus_chunk c
    JOIN chatbot_corpus_source s ON s.id = c.source_id
    WHERE s.status = 'ACTIVE'
      AND c.embedding IS NOT NULL
      AND (${scope}::text IS NULL OR s.scope::text = ${scope}::text)
      AND (${sourceType}::text IS NULL OR s.source_type::text = ${sourceType}::text)
    ORDER BY c.embedding <=> ${vectorLiteral}::vector ASC
    LIMIT ${topK}
  `;

  return rows.map((r) => ({
    source_id: r.source_id,
    chunk_id: r.chunk_id,
    cite_label: r.cite_label,
    cite_url: r.cite_url,
    page_number: r.page_number,
    section_title: r.section_title,
    content: r.content,
    similarity: r.similarity,
  }));
};
