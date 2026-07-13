import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

describe("Lint — corpus tables remain dormant", () => {
  it("never references corpus_* models or table names in apps/api/src", () => {
    const repoRoot = resolve(import.meta.dirname, "../../../../../..");
    let stdout = "";
    let exitCode = 0;
    try {
      stdout = execFileSync(
        "grep",
        [
          "-rE",
          "--include=*.ts",
          "(chatbotCorpusSource|chatbotCorpusChunk|chatbotCorpusIngestRun|chatbot_corpus_source|chatbot_corpus_chunk|chatbot_corpus_ingest_run)",
          "apps/api/src/",
        ],
        { cwd: repoRoot, encoding: "utf8" }
      );
    } catch (err) {
      const e = err as { status?: number; stdout?: string };
      exitCode = e.status ?? 0;
      stdout = e.stdout ?? "";
    }
    expect(exitCode, `grep matched corpus table references:\n${stdout}`).toBe(
      1
    );
    expect(stdout).toBe("");
  });
});
