import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Lightweight unit tests for the seed tool (no database / testcontainers). Only
// the storage preflight and the subcategory position check are covered today;
// add more `*.test.ts` under `src`.
export default defineConfig({
  // Mirrors the `@/*` path in tsconfig.json, which the seed scripts import
  // each other by; without it any test that reaches one of them fails to
  // resolve.
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
