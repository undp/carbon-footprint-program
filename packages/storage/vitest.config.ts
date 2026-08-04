import { defineConfig } from "vitest/config";

// Fast, pure unit tests for @repo/storage — no storage SDK, network, or
// testcontainers. Co-located `*.test.ts` under `src`. The provider adapters'
// live behaviour is covered by the apps/api storage integration legs
// (test:storage-azure / test:storage-minio); these tests cover the pure config
// parser and client-construction wiring that those integration tests do not.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
