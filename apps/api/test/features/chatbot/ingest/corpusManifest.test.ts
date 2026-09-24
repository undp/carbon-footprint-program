import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectCorpusDocuments,
  contentVersion,
  explanationAnchor,
  explanationLabel,
  resolveCiteUrl,
  type CorpusManifest,
} from "../../../../scripts/chatbot/corpusManifest.js";

const makeCorpus = async (files: Record<string, string>): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "corpus-"));
  for (const [relativePath, content] of Object.entries(files)) {
    await mkdir(join(dir, relativePath, ".."), { recursive: true });
    await writeFile(join(dir, relativePath), content);
  }
  return dir;
};

const EXPLANATIONS_ONLY: CorpusManifest = {
  documents: [],
  explanations: [{ dir: "sub", labelPrefix: "Subcategoría", scope: "GLOBAL" }],
};

describe("explanationLabel", () => {
  it("drops the heading's emoji and prefixes the category code", () => {
    expect(
      explanationLabel(
        "c1_emisiones_fugitivas.md",
        "# 🧪 Emisiones fugitivas\n\nTexto.",
        "Subcategoría"
      )
    ).toBe("Subcategoría C1 — Emisiones fugitivas");
  });

  it("omits the code when the file name carries none", () => {
    expect(explanationLabel("otras.md", "# Otras", "Categoría")).toBe(
      "Categoría — Otras"
    );
  });

  it("refuses a file without a heading", () => {
    expect(() => explanationLabel("c1_x.md", "Solo texto.", "X")).toThrow(
      /c1_x\.md/
    );
  });
});

describe("explanationAnchor", () => {
  it("drops the parentheses that would end a Markdown link early", () => {
    expect(explanationAnchor("c1_combustiones_moviles_(flota_propia).md")).toBe(
      "c1-combustiones-moviles-flota-propia"
    );
  });

  it("strips diacritics", () => {
    expect(explanationAnchor("c3_disposición.md")).toBe("c3-disposicion");
  });
});

describe("resolveCiteUrl", () => {
  it("keeps a fixed URL as is", () => {
    expect(
      resolveCiteUrl({ url: "https://ghgprotocol.org/" }, "https://app.org")
    ).toBe("https://ghgprotocol.org/");
  });

  it("appends an anchor to the app URL, keeping its path", () => {
    expect(
      resolveCiteUrl({ anchor: "c1-fugitivas" }, "https://app.org/huella")
    ).toBe("https://app.org/huella#c1-fugitivas");
  });
});

describe("contentVersion", () => {
  it("is stable for the same content and changes with it", () => {
    const version = contentVersion(Buffer.from("a"));
    expect(version).toMatch(/^sha256-[0-9a-f]{12}$/);
    expect(contentVersion(Buffer.from("a"))).toBe(version);
    expect(contentVersion(Buffer.from("b"))).not.toBe(version);
  });
});

describe("collectCorpusDocuments", () => {
  it("tells apart explanations whose headings repeat across categories", async () => {
    const dir = await makeCorpus({
      "sub/c1_otras.md": "# Otras fuentes\n\nUno.",
      "sub/c3_otras.md": "# Otras fuentes\n\nDos.",
      "sub/notas.txt": "ignorado",
    });

    const documents = await collectCorpusDocuments(dir, EXPLANATIONS_ONLY);

    expect(documents.map((document) => document.label)).toEqual([
      "Subcategoría C1 — Otras fuentes",
      "Subcategoría C3 — Otras fuentes",
    ]);
    expect(documents.map((document) => document.citation)).toEqual([
      { anchor: "c1-otras" },
      { anchor: "c3-otras" },
    ]);
  });

  it("refuses two documents that would share a label", async () => {
    const dir = await makeCorpus({
      "sub/c1_a.md": "# Mismo título",
      "sub/c1_b.md": "# Mismo título",
    });

    await expect(
      collectCorpusDocuments(dir, EXPLANATIONS_ONLY)
    ).rejects.toThrow(/comparten la etiqueta/);
  });

  it("refuses a label containing a colon", async () => {
    const dir = await makeCorpus({ "doc.md": "# Doc" });

    await expect(
      collectCorpusDocuments(dir, {
        documents: [
          {
            file: "doc.md",
            label: "Guía: parte 1",
            scope: "GLOBAL",
            citeUrl: "https://example.org",
          },
        ],
        explanations: [],
      })
    ).rejects.toThrow(/no puede contener ":"/);
  });

  it("fails on a listed document that is missing", async () => {
    const dir = await makeCorpus({});

    await expect(
      collectCorpusDocuments(dir, {
        documents: [
          {
            file: "falta.pdf",
            label: "Falta",
            scope: "GLOBAL",
            citeUrl: "https://example.org",
          },
        ],
        explanations: [],
      })
    ).rejects.toThrow(/falta\.pdf/);
  });
});
