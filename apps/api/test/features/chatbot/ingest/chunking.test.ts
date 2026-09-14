import { describe, it, expect } from "vitest";
import { chunkText } from "../../../../scripts/chatbot/chunking.js";

// Mirrors the private constants in scripts/chatbot/chunking.ts. They are not
// exported (nothing in src needs them), so the expectations restate them and
// this comment is the link: if the module's targets move, these move with them.
const TARGET_TOKENS = 600;
const OVERLAP_TOKENS = 80;
// A chunk is packed up to TARGET_TOKENS on top of the overlap carried over
// from the previous one. The extra token is the single space `flushPending`
// inserts between that overlap and the first new block: block token counts are
// rounded up individually, so only that one join can push the joined string
// into another token. 681 is the measured worst case, not a safety margin.
const MAX_CHUNK_TOKENS = TARGET_TOKENS + OVERLAP_TOKENS + 1;

// 4 chars per token (estimateTokens), so 2400 chars is exactly the target.
const sentencesOfLength = (chars: number): string => {
  const sentence = `${"a".repeat(78)}. `;
  return sentence.repeat(Math.ceil(chars / sentence.length)).trim();
};

describe("chunkText — oversized blocks", () => {
  it("splits a paragraph that is larger than the target on its own", () => {
    // pdf-parse flattens a page into one long line: a single block with no
    // blank line and no header-matching line inside it. The packing loop can
    // only cut BETWEEN blocks, so without a pre-split this whole paragraph
    // would be emitted as one chunk.
    const flattenedPage = sentencesOfLength(12000);
    const text = `1 INTRODUCCIÓN\n${flattenedPage}\n\n2 ALCANCE\nUn párrafo corto.`;

    const chunks = chunkText(text);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.tokens).toBeLessThanOrEqual(MAX_CHUNK_TOKENS);
    }
  });

  it("bounds a run that carries no sentence boundary at all", () => {
    // No `.`/`!`/`?`, so the sentence splitter yields a single piece and only
    // the length-based slice can bound it.
    const text = "x".repeat(20000);

    const chunks = chunkText(text);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.tokens).toBeLessThanOrEqual(MAX_CHUNK_TOKENS);
    }
  });

  it("keeps the full text of an oversized paragraph across the split", () => {
    const flattenedPage = sentencesOfLength(8000);
    const chunks = chunkText(flattenedPage);

    // Concatenating the chunks reproduces every sentence — the split may add
    // overlap, but it must not drop content.
    const joined = chunks.map((c) => c.content).join(" ");
    for (const sentence of flattenedPage.split(". ")) {
      expect(joined).toContain(sentence.trim().replace(/\.$/, ""));
    }
  });
});

// Distinct sentences: a paragraph of repeated identical text would make one
// chunk a substring of another by coincidence, which is exactly what the
// duplicate-chunk assertion below is trying to rule out.
const uniqueSentences = (count: number, offset: number): string =>
  Array.from(
    { length: count },
    (_, i) => `Oracion numero ${offset + i} ${"x".repeat(60)}.`
  ).join(" ");

describe("chunkText — carried-over overlap", () => {
  const withHeaders = [
    "1 INTRODUCCIÓN",
    uniqueSentences(40, 0),
    "",
    "2 ALCANCE UNO",
    uniqueSentences(40, 100),
    "",
    "3 ALCANCE DOS",
    uniqueSentences(40, 200),
  ].join("\n");

  it("advances the section title as headings go by", () => {
    const chunks = chunkText(withHeaders);

    const titles = new Set(chunks.map((c) => c.sectionTitle));
    // The overlap tail left in `pending` by every flush used to keep the
    // title pinned to the first heading for the whole document.
    expect(titles.size).toBeGreaterThan(1);
    expect(chunks.at(-1)?.sectionTitle).toBe("3 ALCANCE DOS");
  });

  it("does not emit a chunk whose content is already inside its predecessor", () => {
    const chunks = chunkText(withHeaders);

    // The final flush used to emit the leftover overlap tail on its own — a
    // chunk duplicated verbatim inside the one before it.
    for (let i = 1; i < chunks.length; i += 1) {
      const previous = chunks[i - 1];
      const current = chunks[i];
      expect(previous.content).not.toContain(current.content);
    }
  });
});
