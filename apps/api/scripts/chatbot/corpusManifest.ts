import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, parse } from "node:path";
import { z } from "zod";
import { CorpusSourceScope, CorpusSourceType } from "@repo/database/enums";

/** File name of the manifest at the root of the corpus folder. */
export const CORPUS_MANIFEST_FILE = "manifest.json";

const scopeSchema = z.enum([
  CorpusSourceScope.GLOBAL,
  CorpusSourceScope.NATIONAL,
]);

const corpusManifestSchema = z.object({
  /** Third-party documents, each with its own citation. */
  documents: z.array(
    z.object({
      file: z.string().min(1),
      label: z.string().min(1),
      scope: scopeSchema,
      citeUrl: z.url({ protocol: /^https$/ }),
    })
  ),
  /**
   * Folders of platform explanations (one `.md` per category/subcategory).
   * Their label comes from each file's heading and their citation from the
   * deployment's app URL, which is only known at run time.
   */
  explanations: z.array(
    z.object({
      dir: z.string().min(1),
      labelPrefix: z.string().min(1),
      scope: scopeSchema,
    })
  ),
});

export type CorpusManifest = z.infer<typeof corpusManifestSchema>;

/**
 * Where a document's citation points. Third-party documents carry a fixed URL;
 * explanations carry only an anchor, resolved against the app URL once the
 * operator has confirmed it.
 */
type CorpusCitation = { url: string } | { anchor: string };

export type CorpusDocument = {
  /** Absolute path handed to the ingest CLI. */
  filePath: string;
  /** Path relative to the corpus folder, for display. */
  relativePath: string;
  label: string;
  version: string;
  sourceType: typeof CorpusSourceType.PDF | typeof CorpusSourceType.MD;
  scope: CorpusSourceScope;
  citation: CorpusCitation;
};

/**
 * Content-derived version. Re-running the ingest over an unchanged file yields
 * the same `(name, version)`, which is what lets the orchestrator skip it
 * instead of stacking identical DRAFTs.
 */
export const contentVersion = (content: Buffer): string =>
  `sha256-${createHash("sha256").update(content).digest("hex").slice(0, 12)}`;

/**
 * URL-fragment slug for an explanation file. Parentheses are dropped on
 * purpose: the citation reaches the model as `[label](url)`, and a `)` inside
 * the URL would end that Markdown link early.
 */
export const explanationAnchor = (fileName: string): string =>
  parse(fileName)
    .name.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Citation label for an explanation, e.g. "Subcategoría C1 — Emisiones
 * fugitivas". The category code from the file name is kept because headings
 * repeat across categories ("Emisiones provenientes de otras fuentes" exists
 * under C1 and C3), and two sources sharing a name would replace each other
 * on activation.
 */
export const explanationLabel = (
  fileName: string,
  markdown: string,
  labelPrefix: string
): string => {
  const heading = /^#[ \t]+(.+)$/m.exec(markdown)?.[1];
  // Headings open with an emoji; keep the text from the first letter on.
  const title = heading?.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  if (!title) {
    throw new Error(
      `La explicación "${fileName}" no tiene un título "# ..." del que derivar su etiqueta.`
    );
  }
  const categoryCode = /^(c\d+)_/i.exec(fileName)?.[1]?.toUpperCase();
  return categoryCode
    ? `${labelPrefix} ${categoryCode} — ${title}`
    : `${labelPrefix} — ${title}`;
};

export const resolveCiteUrl = (
  citation: CorpusCitation,
  appUrl: string
): string => {
  if ("url" in citation) return citation.url;
  const url = new URL(appUrl);
  url.hash = citation.anchor;
  return url.toString();
};

export const readCorpusManifest = async (
  corpusDir: string
): Promise<CorpusManifest> => {
  const manifestPath = join(corpusDir, CORPUS_MANIFEST_FILE);
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`No se pudo leer ${manifestPath}: ${reason}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`${manifestPath} no es JSON válido: ${reason}`);
  }
  const parsed = corpusManifestSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `${manifestPath} no tiene el formato esperado:\n${z.prettifyError(parsed.error)}`
    );
  }
  return parsed.data;
};

const sourceTypeFor = (fileName: string): CorpusDocument["sourceType"] => {
  const extension = parse(fileName).ext.toLowerCase();
  if (extension === ".pdf") return CorpusSourceType.PDF;
  if (extension === ".md") return CorpusSourceType.MD;
  throw new Error(
    `"${fileName}" no es .pdf ni .md; el ingest solo acepta esos formatos.`
  );
};

/**
 * Enforce what the ingest and activate CLIs would otherwise reject one file at
 * a time, halfway through a run: a ":" in the label, and two documents sharing
 * a label (activation would mark one OUTDATED in favour of the other) or a
 * citation URL (the chat's source panel collapses them into one entry).
 */
const assertDocumentsAreDistinct = (documents: CorpusDocument[]): void => {
  const seenLabels = new Map<string, string>();
  const seenCitations = new Map<string, string>();
  for (const document of documents) {
    if (document.label.includes(":")) {
      throw new Error(
        `La etiqueta "${document.label}" (${document.relativePath}) no puede contener ":".`
      );
    }
    const labelOwner = seenLabels.get(document.label);
    if (labelOwner) {
      throw new Error(
        `${labelOwner} y ${document.relativePath} comparten la etiqueta "${document.label}".`
      );
    }
    seenLabels.set(document.label, document.relativePath);
    const citationKey = JSON.stringify(document.citation);
    const citationOwner = seenCitations.get(citationKey);
    if (citationOwner) {
      throw new Error(
        `${citationOwner} y ${document.relativePath} comparten la misma URL de cita.`
      );
    }
    seenCitations.set(citationKey, document.relativePath);
  }
};

/**
 * Expand the manifest into the full list of documents to ingest, reading every
 * file so a missing document or a broken symlink fails here, before anything
 * is written.
 */
export const collectCorpusDocuments = async (
  corpusDir: string,
  manifest: CorpusManifest
): Promise<CorpusDocument[]> => {
  const documents: CorpusDocument[] = [];

  for (const entry of manifest.documents) {
    const filePath = join(corpusDir, entry.file);
    documents.push({
      filePath,
      relativePath: entry.file,
      label: entry.label,
      version: contentVersion(await readFile(filePath)),
      sourceType: sourceTypeFor(entry.file),
      scope: entry.scope,
      citation: { url: entry.citeUrl },
    });
  }

  for (const folder of manifest.explanations) {
    const folderPath = join(corpusDir, folder.dir);
    const fileNames = (await readdir(folderPath))
      .filter((fileName) => fileName.toLowerCase().endsWith(".md"))
      .sort();
    for (const fileName of fileNames) {
      const filePath = join(folderPath, fileName);
      const content = await readFile(filePath);
      documents.push({
        filePath,
        relativePath: join(folder.dir, fileName),
        label: explanationLabel(
          fileName,
          content.toString("utf8"),
          folder.labelPrefix
        ),
        version: contentVersion(content),
        sourceType: CorpusSourceType.MD,
        scope: folder.scope,
        citation: { anchor: explanationAnchor(fileName) },
      });
    }
  }

  assertDocumentsAreDistinct(documents);
  return documents;
};
