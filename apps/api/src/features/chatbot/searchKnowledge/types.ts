import type { CorpusSourceScope, CorpusSourceType } from "@repo/database/enums";

export type ChunkWithMetadata = {
  source_id: bigint;
  chunk_id: bigint;
  cite_label: string | null;
  cite_url: string | null;
  page_number: number | null;
  section_title: string | null;
  content: string;
  similarity: number;
};

export type SearchKnowledgeOptions = {
  topK?: number;
  scope?: CorpusSourceScope;
  sourceType?: CorpusSourceType;
};
