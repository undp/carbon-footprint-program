import path from "node:path";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Obtener __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Coverage thresholds are enforced in CI, not per Vitest run. The suite is split
// into three disjoint legs (base + one per storage provider; see the `test` job
// in .github/workflows/ci.yml), so no single run sees the whole codebase and a
// per-run threshold would fail on the files that run never touches. The real
// gate is the `coverage` CI job, which merges all three legs' coverage and
// checks the union against per-metric thresholds (90% for lines, statements,
// functions, and branches; see scripts/check-coverage.mjs). These zeros keep
// each run's numbers visible in its own report without gating on a partial view.
const coverageThresholds = {
  lines: 0,
  functions: 0,
  branches: 0,
  statements: 0,
};

/** Default test glob — the full apps/api suite. */
const DEFAULT_TEST_INCLUDE = ["test/**/*.{test,spec}.{js,ts}"];

export interface ApiVitestConfigOverrides {
  /**
   * Overrides `test.include`. Defaults to the full suite. The storage-only
   * config (`vitest.storage.config.ts`) passes the storage manifest here so the
   * `test:storage-*` legs run just the storage-dependent files.
   */
  include?: string[];
  /**
   * Extra `test.exclude` globs, appended to Vitest's defaults (never replacing
   * them — dropping `configDefaults.exclude` would let node_modules/dist leak
   * in). The base config (`vitest.base.config.ts`) passes the storage manifest
   * here so `test:base` runs everything EXCEPT the storage-dependent files.
   */
  exclude?: string[];
}

/**
 * Single source of truth for the apps/api Vitest config. Every runnable config
 * (`vitest.config.ts` full suite, `vitest.base.config.ts` no-storage,
 * `vitest.storage.config.ts` storage manifest only) calls this, so everything
 * except `test.include` / `test.exclude` stays identical across runs.
 */
export function defineApiVitestConfig(
  overrides: ApiVitestConfigOverrides = {}
) {
  return defineConfig({
    plugins: [
      tsconfigPaths({
        root: __dirname,
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@test": path.resolve(__dirname, "./test"),
      },
    },
    test: {
      globals: true,
      environment: "node",
      // Multiple reporters for better visibility
      reporters: process.env.CI ? ["default", "html"] : ["verbose", "html"],
      include: overrides.include ?? DEFAULT_TEST_INCLUDE,
      exclude: [...configDefaults.exclude, ...(overrides.exclude ?? [])],
      testTimeout: 30000,
      hookTimeout: 30000,
      teardownTimeout: 10000,
      pool: "threads",
      // PROTOTYPE: per-file database isolation (test/setup/perFileDatabase.ts)
      // gives every file its own cloned DB, so files can now run in parallel
      // safely. Set to 4 to match the 4 vCPUs on GitHub's ubuntu-latest runners.
      // Benchmarked against Postgres contention: 2→4 workers cut local wall-clock
      // ~43% (90s→52s) with zero failures / no flakiness across all 150 files.
      maxWorkers: 4,
      fileParallelism: true,
      globalSetup: ["./test/setup/globalSetup.ts"],
      // Runs once per test file, in the worker, before the file's own hooks —
      // clones a private database from the seeded template for that file.
      setupFiles: ["./test/setup/perFileDatabase.ts"],
      // Better logging for UI
      logHeapUsage: true,
      // Detailed output (kept outside ./coverage to avoid clobbering the
      // coverage report directory under vitest 4.1+, which now refuses to
      // copy the report into a subdirectory of itself).
      outputFile: {
        html: "./vitest-report/index.html",
      },
      server: {
        deps: {
          inline: [
            "@fastify/cors",
            "@fastify/jwt",
            "@fastify/swagger",
            "@fastify/swagger-ui",
            "@fastify/under-pressure",
            "@fastify/rate-limit",
            "@fastify/multipart",
            "@fastify/autoload",
            "@fastify/helmet",
          ],
        },
      },
      coverage: {
        enabled: true,
        provider: "v8",
        // Multiple reporters for comprehensive coverage view
        reporter: [
          "text",
          "text-summary",
          "json",
          "json-summary",
          "html",
          "lcov",
        ],
        include: ["src/**/*.{js,ts}"],
        exclude: [
          "node_modules/",
          "test/",
          "**/*.test.ts",
          "**/*.spec.ts",
          "**/*.example.ts",
          "**/types/**",
          "**/*.d.ts",
          "**/dist/**",
          "**/*.config.{js,ts}",
          "**/server.ts", // Entry point, often hard to test
        ],
        // Coverage thresholds - will show in UI
        thresholds: coverageThresholds,
        // More detailed reporting. Defaults to ./coverage; overridable via
        // COVERAGE_DIR so the `test:coverage` script can point each leg at its
        // own directory and merge them (mirrors the CI `coverage` job).
        reportsDirectory: process.env.COVERAGE_DIR ?? "./coverage",
        clean: true,
        cleanOnRerun: true,
      },
      env: {
        NODE_ENV: "test",
        AUTH_PROVIDER: "forced-user", // Set AUTH_PROVIDER for all tests
        FORCED_USER_IDP_ID: "test-user-idp-id",
        FORCED_USER_EMAIL: "me@test.com",
        LOCAL_BYPASS_REQUIRED_FIELDS: "false",
        LLM_PROVIDER: "mock",
        COOKIE_SECRET: "test-cookie-secret-do-not-use-in-prod",
      },
    },
  });
}
