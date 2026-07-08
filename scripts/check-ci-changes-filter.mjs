#!/usr/bin/env node
// Guards the `code` path-filter used by the `changes` job in
// .github/workflows/ci.yml against drift.
//
// The filter is a second source of truth for "what affects the build". If it is
// silently narrowed, or a new build-affecting config is added without a matching
// filter entry, a real code change could be misclassified as docs-only and skip
// the gated jobs (lint / type-check / test / build). This script fails CI in
// that case. It has no dependencies (plain Node) so it runs without an install.
//
// It checks two things:
//   1. Drift: the pattern list in ci.yml exactly matches EXPECTED below. Any
//      intentional change must also be reflected here (and re-reviewed).
//   2. Behaviour: a table of representative paths classifies as expected when
//      matched against the patterns actually present in ci.yml.

import { readFileSync } from "node:fs";

const CI_YML = new URL("../.github/workflows/ci.yml", import.meta.url);

// The canonical `code` filter. Keep in sync with ci.yml (that is the point).
const EXPECTED = [
  "apps/**",
  "packages/**",
  "tools/**",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  ".npmrc",
  "patches/**",
  "turbo.json",
  ".nvmrc",
  "**/package.json",
  "**/tsconfig*.json",
  ".github/workflows/ci.yml",
];

// [path, shouldRunHeavyJobs]. Documents which changes must (not) trigger the
// gated jobs. `false` cases are docs, or tooling that only affects ungated jobs.
const CASES = [
  ["apps/api/src/index.ts", true],
  ["apps/web/src/main.tsx", true],
  ["apps/api/eslint.config.ts", true],
  ["packages/types/src/index.ts", true],
  ["tools/seed/src/seed.ts", true],
  ["pnpm-lock.yaml", true],
  ["pnpm-workspace.yaml", true],
  [".npmrc", true],
  ["patches/some-dep@1.0.0.patch", true],
  ["turbo.json", true],
  [".nvmrc", true],
  ["package.json", true],
  ["apps/web/package.json", true],
  ["tsconfig.json", true],
  ["apps/web/tsconfig.app.json", true],
  [".github/workflows/ci.yml", true],

  ["README.md", false],
  ["docs/governance.md", false],
  ["CONTRIBUTING.md", false],
  ["docs/openssf/passing_badge_assesment.md", false],
  [".github/ISSUE_TEMPLATE/config.yml", false],
  [".github/PULL_REQUEST_TEMPLATE.md", false],
  [".github/workflows/codeql.yml", false], // separate workflow, own job
  [".prettierrc", false], // format job is ungated
  [".prettierignore", false], // format job is ungated
  [".tool-versions", false], // CI uses .nvmrc + packageManager, not this
  ["LICENSE", false],
];

// Convert a picomatch-style glob (the subset used by the filter) to a RegExp.
function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          re += "(?:.*/)?"; // '**/' — zero or more leading directories
          i += 2;
        } else {
          re += ".*"; // trailing '**'
          i += 1;
        }
      } else {
        re += "[^/]*"; // single '*' — within one path segment
      }
    } else if (".+?^${}()|[]\\".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

// Extract the quoted patterns under the `code:` key of the paths-filter block.
function extractFilter(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^\s*code:\s*$/.test(l));
  if (start === -1)
    throw new Error("could not find the `code:` filter in ci.yml");
  const patterns = [];
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^\s*-\s*'([^']+)'\s*$/);
    if (!m) break; // first non-list line ends the block
    patterns.push(m[1]);
  }
  return patterns;
}

const errors = [];
const actual = extractFilter(readFileSync(CI_YML, "utf8"));

// 1. Drift check (order-independent).
const a = [...actual].sort();
const e = [...EXPECTED].sort();
const missing = e.filter((p) => !a.includes(p));
const extra = a.filter((p) => !e.includes(p));
if (missing.length || extra.length) {
  errors.push(
    "ci.yml `code` filter drifted from EXPECTED." +
      (missing.length ? `\n  missing from ci.yml: ${missing.join(", ")}` : "") +
      (extra.length ? `\n  unexpected in ci.yml: ${extra.join(", ")}` : "") +
      "\n  If this change is intentional, update EXPECTED in this script and " +
      "re-check that every build-affecting path is still covered."
  );
}

// 2. Behaviour check against the patterns actually in ci.yml.
const regexes = actual.map(globToRegExp);
const matches = (path) => regexes.some((r) => r.test(path));
for (const [path, expected] of CASES) {
  if (matches(path) !== expected) {
    errors.push(
      `path "${path}" should ${expected ? "" : "NOT "}trigger the gated jobs, ` +
        `but the filter says ${matches(path)}.`
    );
  }
}

if (errors.length) {
  console.error("✗ CI changes-filter check failed:\n");
  for (const err of errors) console.error("- " + err + "\n");
  process.exit(1);
}

console.log(
  `✓ CI changes-filter OK — ${actual.length} patterns, ${CASES.length} cases.`
);
