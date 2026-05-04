import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

describe("Lint — no writes to dormant chatbot columns", () => {
  it("never references organization_id / ip_hash (raw or camelCase) in chatbot feature source", () => {
    const repoRoot = resolve(import.meta.dirname, "../../../../../..");
    const targetPath = "apps/api/src/features/chatbot/";
    let stdout = "";
    let exitCode = 0;
    try {
      stdout = execFileSync(
        "grep",
        [
          "-rE",
          "(organization_id|ip_hash|organizationId|ipHash)\\s*[:=]",
          targetPath,
        ],
        { cwd: repoRoot, encoding: "utf8" }
      );
    } catch (err) {
      const e = err as { status?: number; stdout?: string };
      exitCode = e.status ?? 0;
      stdout = e.stdout ?? "";
    }
    // grep exits 1 when no match — that's the success case.
    expect(exitCode, `grep matched dormant column writes:\n${stdout}`).toBe(1);
    expect(stdout).toBe("");
  });
});
