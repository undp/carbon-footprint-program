import type { PrismaClient } from "@repo/database";
import { z } from "zod";
import { SourceCitationSchema, type SourceCitation } from "@repo/types";
import {
  InvalidQueryError,
  searchKnowledge,
} from "@/features/chatbot/searchKnowledge/index.js";
import type { ChunkWithMetadata } from "@/features/chatbot/searchKnowledge/index.js";

const SearchKnowledgeArgsSchema = z.object({
  query: z.string().trim().min(1),
});

const EMPTY_RESULT_FALLBACK_MESSAGE = "0 fuentes válidas encontradas";

// Citation-only cap. `SourceCitationSchema` bounds `snippet` at this length,
// so it is what gets persisted and put on the wire. The model is NOT held to
// it: it reads the chunk whole (see `formatToolResultMessage`), because a
// passage cut at 240 characters ends mid-sentence and answers nothing — the
// chunker sizes chunks at ~600 tokens precisely so each one stands alone.
const SNIPPET_MAX_LENGTH = 240;

const truncateForSnippet = (text: string): string => {
  if (text.length <= SNIPPET_MAX_LENGTH) return text;
  return `${text.slice(0, SNIPPET_MAX_LENGTH - 1)}…`;
};

export type ExecuteSearchKnowledgeResult = {
  chunks: ChunkWithMetadata[];
  validSources: SourceCitation[];
  toolResultMessage: string;
};

/**
 * A chunk that cleared citation validation, paired with its full text.
 *
 * The two travel together so the model and the citation panel can never
 * disagree about which sources grounded the turn: the message is built from
 * `content`, the wire payload from `citation`.
 */
type GroundedChunk = { citation: SourceCitation; content: string };

/**
 * Format what the model reads. Carries the chunk whole — the 240-character
 * `snippet` on the citation is for persistence and the wire, not for
 * reasoning. Size is bounded upstream by `topK` and checked against
 * CHATBOT_MAX_RAG_CONTEXT_TOKENS by the handler before the second round.
 */
const formatToolResultMessage = (grounded: GroundedChunk[]): string => {
  if (grounded.length === 0) {
    return EMPTY_RESULT_FALLBACK_MESSAGE;
  }
  return grounded
    .map(({ citation, content }, index) => {
      const label = `[${citation.cite_label}](${citation.cite_url})`;
      return `Fuente ${index + 1}: ${label} - Contenido: "${content}"`;
    })
    .join("\n");
};

const emptyResult = (
  chunks: ChunkWithMetadata[] = []
): ExecuteSearchKnowledgeResult => ({
  chunks,
  validSources: [],
  toolResultMessage: EMPTY_RESULT_FALLBACK_MESSAGE,
});

const buildCandidateCitation = (chunk: ChunkWithMetadata) => ({
  source_id: chunk.source_id.toString(),
  chunk_id: chunk.chunk_id.toString(),
  cite_label: chunk.cite_label ?? "",
  cite_url: chunk.cite_url ?? "",
  snippet: truncateForSnippet(chunk.content),
});

export const executeSearchKnowledgeTool = async (
  prisma: PrismaClient,
  argsJson: string
): Promise<ExecuteSearchKnowledgeResult> => {
  // Tool arguments are model-generated and therefore untrusted. Malformed
  // JSON or a whitespace-only / missing query routes through the K=0
  // empty-result fallback (same path the system prompt's K=0 guardrail
  // expects) instead of throwing out of the handler and turning a single
  // bad tool call into a failed turn.
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(argsJson);
  } catch {
    return emptyResult();
  }
  const argsResult = SearchKnowledgeArgsSchema.safeParse(parsedJson);
  if (!argsResult.success) {
    return emptyResult();
  }
  // InvalidQueryError degrades to the empty result rather than escaping.
  // The tool schema advertises `maxLength: 2000` on `query`, but a JSON-schema
  // length is a hint the model is free to ignore, and searchKnowledge refuses
  // anything past QUERY_TOKEN_LIMIT (512 ≈ 2048 chars). A query a few
  // characters over that used to throw out of here, hit the handler's catch,
  // and answer 503 — a whole turn lost to the model being verbose. Everything
  // else (a dropped connection, a provider outage) still propagates: those are
  // real failures, not a badly-shaped argument.
  let chunks;
  try {
    chunks = await searchKnowledge(prisma, argsResult.data.query);
  } catch (err) {
    if (err instanceof InvalidQueryError) return emptyResult();
    throw err;
  }
  const validSources: SourceCitation[] = [];
  const grounded: GroundedChunk[] = [];
  for (const chunk of chunks) {
    const candidate = buildCandidateCitation(chunk);
    const parseResult = SourceCitationSchema.safeParse(candidate);
    if (parseResult.success) {
      validSources.push(parseResult.data);
      grounded.push({ citation: parseResult.data, content: chunk.content });
    }
  }
  return {
    chunks,
    validSources,
    toolResultMessage: formatToolResultMessage(grounded),
  };
};
