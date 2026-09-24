import { estimateTokens } from "@/features/chatbot/llmProvider/estimateTokens.js";

const TARGET_TOKENS = 600;
const OVERLAP_TOKENS = 80;
const HEADER_WINDOW_TOKENS = 150;

/**
 * A numbered section marker as it survives a PDF-to-text pass: `3 ALCANCE`,
 * `3.1 Límites operativos`.
 */
const NUMBERED_HEADING_REGEX = /^\d+(\.\d+)*\s+[A-Z]/;

/**
 * An ATX Markdown heading: one to six `#` followed by the title. Setext
 * headings (a title underlined with `===` or `---`) are NOT recognised — the
 * underline arrives on the line AFTER the title, so a line-at-a-time reader
 * would have already emitted the title as body text. Documents written that
 * way fall back to sentence blocks, which costs the section title and the
 * heading-aligned boundaries but ingests correctly.
 */
const MARKDOWN_HEADING_REGEX = /^(#{1,6})\s+(\S.*)$/;

/**
 * The section title a line opens, or `null` when the line is body text.
 *
 * Markdown titles are returned without their `#` marks: the value lands in
 * `chatbot_corpus_chunk.section_title` as metadata, where the markup is noise.
 * The block's own content keeps the line verbatim, so the chunk the model
 * reads still shows the heading level.
 */
const headingTitle = (line: string): string | null => {
  const markdown = MARKDOWN_HEADING_REGEX.exec(line);
  if (markdown) return markdown[2].trim();
  return NUMBERED_HEADING_REGEX.test(line) ? line : null;
};

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
    const title = trimmed.length > 0 ? headingTitle(trimmed) : null;
    if (title !== null) {
      flushBuf();
      currentSection = title;
      blocks.push({
        content: trimmed,
        tokens: estimateTokens(trimmed),
        isHeaderStart: true,
        sectionTitle: title,
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

const MAX_BLOCK_CHARS = TARGET_TOKENS * 4;

/**
 * Hard-slice a run of text that carries no sentence boundary at all. Only
 * reachable on pathological input (thousands of characters without `.`/`!`/`?`
 * followed by whitespace), but the packing loop has no other way to bound it.
 */
const sliceOnLength = (text: string): string[] => {
  const pieces: string[] = [];
  for (let start = 0; start < text.length; start += MAX_BLOCK_CHARS) {
    pieces.push(text.slice(start, start + MAX_BLOCK_CHARS));
  }
  return pieces;
};

/**
 * Break a block that cannot fit in a single chunk into <=TARGET_TOKENS pieces.
 *
 * The packing loop below only ever chooses boundaries *between* blocks, so an
 * already-oversized block would be emitted whole. That is not a corner case:
 * pdf-parse routinely flattens a page into one paragraph with no blank line
 * and no header-matching line, which `buildBlocksWithHeaders` turns into a
 * single block. Past ~8k tokens such a block also blows the embedding
 * provider's per-input ceiling and aborts the entire ingest run.
 */
const splitOversizedBlock = (block: Block): Block[] => {
  const pieces: string[] = [];
  let buf = "";
  const flushBuf = (): void => {
    const content = buf.trim();
    if (content.length > 0) pieces.push(content);
    buf = "";
  };
  for (const sentence of splitIntoSentences(block.content)) {
    const parts =
      estimateTokens(sentence) > TARGET_TOKENS
        ? sliceOnLength(sentence)
        : [sentence];
    for (const part of parts) {
      const candidate = buf.length === 0 ? part : `${buf} ${part}`;
      if (buf.length > 0 && estimateTokens(candidate) > TARGET_TOKENS) {
        flushBuf();
        buf = part;
        continue;
      }
      buf = candidate;
    }
  }
  flushBuf();
  return pieces.map((content, index) => ({
    content,
    tokens: estimateTokens(content),
    // Only the first piece can still open a section; the rest continue the
    // same paragraph.
    isHeaderStart: index === 0 && block.isHeaderStart,
    sectionTitle: block.sectionTitle,
  }));
};

/**
 * Split a long piece of text into ~600-token chunks with ~80-token overlap.
 *
 * Two-pass strategy:
 * 1. Detect section headings on each line — numbered markers
 *    (/^\d+(\.\d+)*\s+[A-Z]/, how a PDF's sections survive text extraction)
 *    and ATX Markdown headings (/^#{1,6}\s+/) — and
 *    build "blocks" — each block is either a header line or a paragraph
 *    between headers/blank lines. When packing, an upcoming header within
 *    ±HEADER_WINDOW_TOKENS of the current target (~600) becomes a preferred
 *    split boundary so the header opens the next chunk.
 * 2. If the line-anchored regex matched nothing (pdf-parse can flatten
 *    newlines on multi-column or soft-wrapped layouts), fall back to
 *    sentence-boundary blocks. The packing algorithm is identical, just
 *    with no header-preference signal.
 * 3. Whichever pass produced them, split any block that is on its own larger
 *    than the target, so the packing loop below is never handed a block it
 *    cannot place (see splitOversizedBlock).
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
  blocks = blocks.flatMap((b) =>
    b.tokens > TARGET_TOKENS ? splitOversizedBlock(b) : [b]
  );

  const chunks: Chunk[] = [];
  let pending: Block[] = [];
  let pendingTokens = 0;
  let pendingTitle: string | null = null;
  // True while `pending` holds nothing but the overlap tail carried over from
  // the previous flush. That tail is not new content, so it must neither fix
  // the next chunk's section title nor be emitted as a chunk of its own.
  let pendingIsOverlapOnly = false;

  const flushPending = (): void => {
    if (pending.length === 0 || pendingIsOverlapOnly) return;
    const content = pending
      .map((b) => b.content)
      .join(" ")
      .trim();
    if (content.length === 0) {
      pending = [];
      pendingTokens = 0;
      pendingIsOverlapOnly = false;
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
      pendingIsOverlapOnly = pending.length > 0;
    } else {
      pending = [];
      pendingTokens = 0;
      pendingIsOverlapOnly = false;
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
    // The carried-over overlap keeps the PREVIOUS chunk's title, so the first
    // genuinely new block is what sets the title of the chunk being built.
    if (pending.length === 0 || pendingIsOverlapOnly) {
      pendingTitle = block.sectionTitle;
    }
    pending.push(block);
    pendingTokens += block.tokens;
    pendingIsOverlapOnly = false;
  }
  flushPending();

  return chunks;
};
