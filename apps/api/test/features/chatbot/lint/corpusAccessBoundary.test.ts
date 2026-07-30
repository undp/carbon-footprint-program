import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

// Replaces the foundation-era `noReferencesToCorpusTables` test, which asserted
// the corpus tables were referenced NOWHERE in apps/api/src. The RAG phase
// activates them on purpose, so that invariant is gone — but the weaker,
// still-useful one remains: corpus access is a detail of the retrieval module,
// and no other feature should reach into those tables directly. Ingest/activate
// live in apps/api/scripts (outside src) and are intentionally out of scope.
const CORPUS_IDENTIFIERS =
  "(chatbotCorpusSource|chatbotCorpusChunk|chatbotCorpusIngestRun|chatbot_corpus_source|chatbot_corpus_chunk|chatbot_corpus_ingest_run)";

/** The only directory in apps/api/src allowed to touch the corpus tables. */
const ALLOWED_PREFIX = "apps/api/src/features/chatbot/searchKnowledge/";

describe("Lint — corpus table access stays inside the retrieval module", () => {
  it("references chatbot_corpus_* only under searchKnowledge/", () => {
    const repoRoot = resolve(import.meta.dirname, "../../../../../..");
    let stdout = "";
    try {
      // -l: file names only. grep exits 1 with empty stdout when nothing
      // matches, which `catch` normalizes to the same empty-list result.
      stdout = execFileSync(
        "grep",
        ["-rlE", "--include=*.ts", CORPUS_IDENTIFIERS, "apps/api/src/"],
        { cwd: repoRoot, encoding: "utf8" }
      );
    } catch (err) {
      const e = err as { stdout?: string };
      stdout = e.stdout ?? "";
    }

    const offenders = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((file) => !file.startsWith(ALLOWED_PREFIX));

    expect(
      offenders,
      `corpus tables referenced outside ${ALLOWED_PREFIX}:\n${offenders.join("\n")}`
    ).toEqual([]);
  });

  // Guards the guard: if retrieval is ever refactored out of that directory the
  // assertion above would pass vacuously, so prove the pattern still matches
  // somewhere. A silently-vacuous lint test is worse than no lint test.
  it("still finds the retrieval module (the check is not vacuous)", () => {
    const repoRoot = resolve(import.meta.dirname, "../../../../../..");
    const stdout = execFileSync(
      "grep",
      ["-rlE", "--include=*.ts", CORPUS_IDENTIFIERS, "apps/api/src/"],
      { cwd: repoRoot, encoding: "utf8" }
    );
    expect(stdout).toContain(ALLOWED_PREFIX);
  });
});
