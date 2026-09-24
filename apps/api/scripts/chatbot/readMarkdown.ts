import { readFile } from "node:fs/promises";

/**
 * YAML front matter: a `---` fence on the first line, the next `---` closing
 * it. Stripped because it is document metadata (title, author, dates), not
 * prose — embedding it would put `date: 2026-01-01` in the same vector space
 * as the text a user asks about, and the chunk that carried it would quote
 * the YAML back to the model as if it were content.
 */
const FRONT_MATTER_REGEX = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/;

/**
 * Read a Markdown file as the plain text the chunker consumes.
 *
 * Markdown syntax is left in place on purpose: `##`, `**`, and link syntax
 * are the document's structure, the chunker reads `#` headings as section
 * boundaries (see `chunking.ts`), and the model reads Markdown natively —
 * stripping it would cost the heading signal and buy nothing.
 *
 * Known limitation: a table is flattened. `buildBlocksWithHeaders` joins
 * consecutive non-blank lines with a space, so `| a | b |` rows end up glued
 * into one paragraph. The text survives, the column alignment does not — a
 * corpus that is mostly tabular wants a dedicated reader, not this one.
 */
export const readMarkdown = async (filePath: string): Promise<string> => {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `No se pudo leer el archivo Markdown en ${filePath}: ${reason}`
    );
  }
  // A UTF-8 BOM survives a utf8 read as U+FEFF and would sit in front of the
  // front-matter fence, defeating the anchor below and leading the first
  // chunk with an invisible character.
  const withoutBom = raw.replace(/^\uFEFF/, "");
  return withoutBom.replace(FRONT_MATTER_REGEX, "");
};
