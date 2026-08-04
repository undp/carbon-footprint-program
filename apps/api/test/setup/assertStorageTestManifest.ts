/* eslint-disable no-console -- Standalone CLI verifier: it prints an actionable report to the console. */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STORAGE_TEST_MANIFEST } from "./storageTestManifest.js";

/**
 * Static anti-drift check for the storage test manifest
 * (test/setup/storageTestManifest.ts). Run via `pnpm test:api:verify-storage-manifest`
 * before the tests in CI. It fails (exit 1) when:
 *   (a) a test file shows storage markers but is NOT in the manifest,
 *   (b) a manifest entry does not exist on disk,
 *   (c) a manifest entry shows no storage markers.
 *
 * Markers were calibrated against the manifest files and the two known
 * false positives that must stay OUT:
 *   - getOrganizationHistory/service.test.ts (uses createMockStorageAdapter,
 *     which is NOT a marker), and
 *   - storageRelayHelpers.test.ts (pure string logic, no storage usage).
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// test/setup -> apps/api
const API_ROOT = path.resolve(__dirname, "..", "..");
const TEST_DIR = path.join(API_ROOT, "test");

interface StorageMarker {
  readonly label: string;
  readonly pattern: RegExp;
}

/**
 * A test "touches real storage" if it matches any of these. `createMockStorageAdapter`
 * is deliberately excluded — it stubs storage for unit tests and needs no container.
 *
 * NOTE: this regex-based detection is best-effort and intentionally incomplete —
 * it only catches the common storage-usage patterns. The authoritative enforcement
 * is the throwing storage adapter at runtime: any storage test that slips into the
 * base leg and touches `app.storage` fails loudly.
 */
const STORAGE_MARKERS: readonly StorageMarker[] = [
  // Injects the real testcontainer descriptor into createTestApp.
  {
    label: 'inject("storageDescriptor")',
    pattern: /inject\(\s*["']storageDescriptor["']\s*\)/,
  },
  // Seeds a real object through the adapter's putObject.
  { label: "uploadFixture(...)", pattern: /\buploadFixture\s*\(/ },
  {
    label: "factories/storageHelper import",
    pattern: /factories\/storageHelper/,
  },
  // Calls a method on the app's storage adapter directly (relay plugin test).
  { label: "app.storage.<method>", pattern: /\bapp\.storage\./ },
];

const TEST_FILE_PATTERN = /\.(test|spec)\.(js|ts)$/;

/** apps/api-relative, POSIX-normalized paths of every test/spec file under test/. */
function listTestFiles(): string[] {
  const entries = readdirSync(TEST_DIR, { recursive: true, encoding: "utf8" });
  return entries
    .filter((entry) => TEST_FILE_PATTERN.test(entry))
    .map((entry) => path.join("test", entry).split(path.sep).join("/"))
    .sort();
}

function markersIn(content: string): string[] {
  return STORAGE_MARKERS.filter((marker) => marker.pattern.test(content)).map(
    (marker) => marker.label
  );
}

function main(): void {
  const manifest = new Set<string>(STORAGE_TEST_MANIFEST);
  const markersByFile = new Map<string, string[]>();

  for (const relPath of listTestFiles()) {
    const content = readFileSync(path.join(API_ROOT, relPath), "utf8");
    markersByFile.set(relPath, markersIn(content));
  }

  const errors: string[] = [];

  // (a) A file with storage markers that is not in the manifest.
  for (const [relPath, markers] of markersByFile) {
    if (markers.length > 0 && !manifest.has(relPath)) {
      errors.push(
        `${relPath}\n` +
          `    Looks like it uses REAL storage (matched: ${markers.join(", ")}) but is NOT in the manifest.\n` +
          `    → If it touches real storage, add it to STORAGE_TEST_MANIFEST in test/setup/storageTestManifest.ts (so the storage CI legs run it).\n` +
          `    → If it does NOT, remove the storageDescriptor / storage usage so it runs against the throwing test adapter.`
      );
    }
  }

  // (b) A manifest entry that no longer exists, and (c) one with no markers.
  for (const entry of STORAGE_TEST_MANIFEST) {
    const markers = markersByFile.get(entry);
    if (markers === undefined) {
      errors.push(
        `${entry}\n` +
          `    Listed in STORAGE_TEST_MANIFEST but does not exist on disk.\n` +
          `    → Fix or remove the path in test/setup/storageTestManifest.ts.`
      );
      continue;
    }
    if (markers.length === 0) {
      errors.push(
        `${entry}\n` +
          `    Listed in STORAGE_TEST_MANIFEST but shows no storage markers.\n` +
          `    → If it no longer touches storage, remove it from the manifest; otherwise restore the storage usage (e.g. storageDescriptor: inject("storageDescriptor")).`
      );
    }
  }

  if (errors.length > 0) {
    console.error(
      "✖ Storage test manifest is out of sync (apps/api/test/setup/storageTestManifest.ts):\n"
    );
    console.error(errors.join("\n\n"));
    console.error("");
    process.exitCode = 1;
    return;
  }

  console.log(
    `✔ Storage test manifest OK — ${STORAGE_TEST_MANIFEST.length} storage tests, all present and marked.`
  );
}

main();
