#!/usr/bin/env node
// Enforces the apps/api coverage gate in CI.
//
// The apps/api test suite is split across three CI legs that form a disjoint
// partition of the suite (base + one leg per storage provider; see the `test`
// job in .github/workflows/ci.yml). No single leg exercises the whole codebase,
// so a per-run Vitest threshold cannot reflect true coverage — a leg would fail
// on the files it never runs. Instead each leg uploads its raw Istanbul coverage
// (coverage-final.json) as an artifact, and the `coverage` job downloads all
// three legs and runs this script.
//
// It merges the legs' coverage into one map (a line covered by ANY leg counts as
// covered) and fails if the merged line/statement/function/branch percentage is
// below THRESHOLD. This is the real gate; Vitest's own thresholds stay at 0
// (informational only — see apps/api/vitest.shared.ts for why).
//
// Usage: node scripts/check-coverage.mjs [dir]
//   [dir] defaults to "coverage-artifacts" and is searched recursively for
//   every coverage-final.json (one per downloaded leg artifact).

import { globSync, readFileSync } from "node:fs";
import libCoverage from "istanbul-lib-coverage";

const { createCoverageMap, createCoverageSummary } = libCoverage;

const THRESHOLD = Number(process.env.COVERAGE_THRESHOLD ?? 80);
const searchDir = process.argv[2] ?? "coverage-artifacts";

const files = globSync(`${searchDir}/**/coverage-final.json`);

if (files.length === 0) {
  console.error(
    `✖ No coverage-final.json found under "${searchDir}/". ` +
      `Did the test legs upload their coverage artifacts?`
  );
  process.exit(1);
}

const map = createCoverageMap({});
for (const file of files) {
  map.merge(JSON.parse(readFileSync(file, "utf8")));
}

const summary = createCoverageSummary();
for (const f of map.files()) {
  summary.merge(map.fileCoverageFor(f).toSummary());
}

console.log(
  `Merged coverage from ${files.length} leg(s) across ${map.files().length} file(s):`
);

const metrics = ["lines", "statements", "functions", "branches"];
let failed = false;
for (const metric of metrics) {
  const { covered, total, pct } = summary.data[metric];
  // A metric with no measurable entries (total === 0) cannot be below target.
  const ok = total === 0 || pct >= THRESHOLD;
  if (!ok) failed = true;
  console.log(
    `  ${ok ? "✓" : "✗"} ${metric.padEnd(11)} ${pct.toFixed(2).padStart(6)}%  (${covered}/${total})`
  );
}

if (failed) {
  console.error(
    `\n✖ Coverage is below the ${THRESHOLD}% threshold. ` +
      `Download the leg coverage artifacts for the per-file breakdown.`
  );
  process.exit(1);
}

console.log(`\n✔ Coverage meets the ${THRESHOLD}% threshold.`);
