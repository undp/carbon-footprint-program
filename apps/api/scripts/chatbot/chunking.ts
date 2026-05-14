import { estimateTokens } from "@/features/chatbot/llmProvider/estimateTokens.js";

const TARGET_TOKENS = 600;
const OVERLAP_TOKENS = 80;
const HEADER_WINDOW_TOKENS = 150;

const HEADER_REGEX = /^\d+(\.\d+)*\s+[A-Z]/;

export type Chunk = {
  content: string;
  tokens: number;
  pageNumber: number | null;
  sectionTitle: string | null;
};

type Block = {
  content: string;
  tokens: number;
  isHeaderStart: boolean;
  sectionTitle: string | null;
};

const splitIntoSentences = (text: string): string[] => {
  const result: string[] = [];
  const parts = text.split(/(?<=[.!?])\s+/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 0) result.push(trimmed);
  }
  return result;
};

const buildBlocksWithHeaders = (text: string): Block[] => {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let currentSection: string | null = null;
  let buf = "";
  const flushBuf = (): void => {
    const content = buf.trim();
    if (content.length === 0) return;
    blocks.push({
      content,
      tokens: estimateTokens(content),
      isHeaderStart: false,
      sectionTitle: currentSection,
    });
    buf = "";
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && HEADER_REGEX.test(trimmed)) {
      flushBuf();
      currentSection = trimmed;
      blocks.push({
        content: trimmed,
        tokens: estimateTokens(trimmed),
        isHeaderStart: true,
        sectionTitle: trimmed,
      });
      continue;
    }
    if (trimmed.length === 0) {
      flushBuf();
      continue;
    }
    buf = buf.length === 0 ? trimmed : `${buf} ${trimmed}`;
  }
  flushBuf();
  return blocks;
};

const buildBlocksFromSentences = (text: string): Block[] => {
  const flattened = text.replace(/\r?\n/g, " ");
  return splitIntoSentences(flattened).map((sentence) => ({
    content: sentence,
    tokens: estimateTokens(sentence),
    isHeaderStart: false,
    sectionTitle: null,
  }));
};

/**
 * Split a long piece of text into ~600-token chunks with ~80-token overlap.
 *
 * Two-pass strategy:
 * 1. Detect section headings via /^\d+(\.\d+)*\s+[A-Z]/ on each line and
 *    build "blocks" — each block is either a header line or a paragraph
 *    between headers/blank lines. When packing, an upcoming header within
 *    ±HEADER_WINDOW_TOKENS of the current target (~600) becomes a preferred
 *    split boundary so the header opens the next chunk.
 * 2. If the line-anchored regex matched nothing (pdf-parse can flatten
 *    newlines on multi-column or soft-wrapped layouts), fall back to
 *    sentence-boundary blocks. The packing algorithm is identical, just
 *    with no header-preference signal.
 */
export const chunkText = (text: string): Chunk[] => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  let blocks = buildBlocksWithHeaders(trimmed);
  const headerCount = blocks.filter((b) => b.isHeaderStart).length;
  if (headerCount === 0) {
    blocks = buildBlocksFromSentences(trimmed);
  }
  if (blocks.length === 0) return [];

  const chunks: Chunk[] = [];
  let pending: Block[] = [];
  let pendingTokens = 0;
  let pendingTitle: string | null = null;

  const flushPending = (): void => {
    if (pending.length === 0) return;
    const content = pending
      .map((b) => b.content)
      .join(" ")
      .trim();
    if (content.length === 0) {
      pending = [];
      pendingTokens = 0;
      return;
    }
    chunks.push({
      content,
      tokens: estimateTokens(content),
      pageNumber: null,
      sectionTitle: pendingTitle,
    });
    if (OVERLAP_TOKENS > 0) {
      const overlapChars = OVERLAP_TOKENS * 4;
      const tail = content.slice(-overlapChars);
      pending =
        tail.length > 0
          ? [
              {
                content: tail,
                tokens: estimateTokens(tail),
                isHeaderStart: false,
                sectionTitle: pendingTitle,
              },
            ]
          : [];
      pendingTokens = pending.reduce((sum, b) => sum + b.tokens, 0);
    } else {
      pending = [];
      pendingTokens = 0;
    }
  };

  for (const block of blocks) {
    // Header-aligned split: when a header starts and we are within the window
    // of the target boundary, flush the current chunk so the header begins
    // the next chunk. This is the load-bearing piece that turns line 88's
    // "near a header" detection into an actual repositioned boundary.
    if (
      block.isHeaderStart &&
      pending.length > 0 &&
      pendingTokens >= TARGET_TOKENS - HEADER_WINDOW_TOKENS
    ) {
      flushPending();
    }
    if (pending.length > 0 && pendingTokens + block.tokens > TARGET_TOKENS) {
      flushPending();
    }
    if (pending.length === 0) pendingTitle = block.sectionTitle;
    pending.push(block);
    pendingTokens += block.tokens;
  }
  flushPending();

  return chunks;
};
