import { defineConfig } from "vitest/config";

// Lightweight unit tests for the seed tool (no database / testcontainers). Only
// the storage preflight is covered today; add more `*.test.ts` under `src`.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
