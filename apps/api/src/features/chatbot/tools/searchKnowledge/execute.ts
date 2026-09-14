import type { PrismaClient } from "@repo/database";
import { z } from "zod";
import { SourceCitationSchema, type SourceCitation } from "@repo/types";
import { searchKnowledge } from "@/features/chatbot/searchKnowledge/index.js";
import type { ChunkWithMetadata } from "@/features/chatbot/searchKnowledge/index.js";

const SearchKnowledgeArgsSchema = z.object({
  query: z.string().trim().min(1),
});

const EMPTY_RESULT_FALLBACK_MESSAGE = "0 fuentes válidas encontradas";

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

const formatToolResultMessage = (validSources: SourceCitation[]): string => {
  if (validSources.length === 0) {
    return EMPTY_RESULT_FALLBACK_MESSAGE;
  }
  return validSources
    .map((source, index) => {
      const label = `[${source.cite_label}](${source.cite_url})`;
      return `Fuente ${index + 1}: ${label} - Contenido: "${source.snippet}"`;
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
  const chunks = await searchKnowledge(prisma, argsResult.data.query);
  const validSources: SourceCitation[] = [];
  for (const chunk of chunks) {
    const candidate = buildCandidateCitation(chunk);
    const parseResult = SourceCitationSchema.safeParse(candidate);
    if (parseResult.success) {
      validSources.push(parseResult.data);
    }
  }
  return {
    chunks,
    validSources,
    toolResultMessage: formatToolResultMessage(validSources),
  };
};
