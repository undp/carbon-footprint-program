import path from "node:path";
import { fileURLToPath } from "node:url";
import { configDefaults, defineProject } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Obtener __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Coverage thresholds are applied ONLY at the merge/gate step, never per
// project. The suite is split into three disjoint projects (base + one per
// storage provider; see vitest.config.ts), so no single project sees the whole
// codebase and a per-project threshold would fail on the files it never runs.
// v8 merges hit-counts across the projects, so the union is exact: a line
// covered by any project counts as covered. The real gate (90% for lines,
// statements, functions, and branches) is passed by flag — locally by `test:coverage`
// (one `vitest run --coverage` over all projects) and in CI by the `coverage`
// job (`vitest run --merge-reports --coverage` over the per-leg blobs). These
// zeros keep each project's own report ungated.
const coverageThresholds = {
  lines: 0,
  functions: 0,
  branches: 0,
  statements: 0,
};

/** Default test glob — the full apps/api suite. */
const DEFAULT_TEST_INCLUDE = ["test/**/*.{test,spec}.{js,ts}"];

/**
 * Environment shared by every project. The storage-provider vars are added per
 * project (see `storageEnv`), because each project targets a different provider.
 * `test.env` is applied inside each worker, so unlike the old per-process env it
 * isolates the three projects cleanly even when they run in a single command.
 */
const SHARED_TEST_ENV = {
  NODE_ENV: "test",
  AUTH_PROVIDER: "forced-user", // Set AUTH_PROVIDER for all tests
  FORCED_USER_IDP_ID: "test-user-idp-id",
  FORCED_USER_EMAIL: "me@test.com",
  LOCAL_BYPASS_REQUIRED_FIELDS: "false",
  LLM_PROVIDER: "mock",
  COOKIE_SECRET: "test-cookie-secret-do-not-use-in-prod",
  // The chatbot is opt-in (CHATBOT_ENABLED defaults off). Enable it for the
  // suite so its routes register and the chatbot integration tests run
  // (LLM_PROVIDER defaults to "mock").
  CHATBOT_ENABLED: "true",
} as const;

export interface ApiVitestProjectOverrides {
  /**
   * Project name. MUST be one of the names `globalSetup.ts` maps to a storage
   * provider (`base`, `storage-azure`, `storage-minio`): it drives both
   * `--project=<name>` filtering in CI and the provider selection in
   * globalSetup, and it is the branch-protection check name.
   */
  name: string;
  /**
   * Overrides `test.include`. Defaults to the full suite. The storage projects
   * pass the storage manifest here so they run just the storage-dependent files.
   */
  include?: string[];
  /**
   * Extra `test.exclude` globs, appended to Vitest's defaults (never replacing
   * them — dropping `configDefaults.exclude` would let node_modules/dist leak
   * in). The base project passes the storage manifest here so it runs everything
   * EXCEPT the storage-dependent files.
   */
  exclude?: string[];
  /**
   * Provider-selection env for this project. Only needs to satisfy
   * `buildStorageConfig()` validation at `app.ready()`; the real adapter is
   * built from the injected `storageDescriptor` in `createTestApp`, so these are
   * static dummies (the testcontainer's real connection travels via
   * `project.provide`/`inject`).
   */
  storageEnv: Record<string, string>;
}

/**
 * Single source of truth for one apps/api Vitest project. Every project shares
 * everything except its name, its `include`/`exclude`, and its storage-provider
 * env. `defineProject` types the returned object so a stray/root-only key fails
 * HERE at the definition, not silently at runtime.
 *
 * Root-only options are NOT configured here: in projects mode Vitest reads
 * coverage, reporters, outputFile, and teardownTimeout from the ROOT config only
 * (`vitest.config.ts` → `test`), ignoring any per-project copy. Those live in
 * `apiCoverageConfig` / `apiRootTestConfig` below.
 */
export function defineApiVitestProject(overrides: ApiVitestProjectOverrides) {
  return defineProject({
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
      name: overrides.name,
      globals: true,
      environment: "node",
      include: overrides.include ?? DEFAULT_TEST_INCLUDE,
      exclude: [...configDefaults.exclude, ...(overrides.exclude ?? [])],
      testTimeout: 30000,
      hookTimeout: 30000,
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
      env: {
        ...SHARED_TEST_ENV,
        ...overrides.storageEnv,
      },
    },
  });
}

/**
 * Root-only `test` options for the apps/api suite, spread into the ROOT config's
 * `test` (`vitest.config.ts`). These are all in Vitest's `NonProjectOptions`, so
 * they are ignored inside a project config and MUST live at the root. There is a
 * single reporter set for the whole run, so one (non-namespaced) HTML path can't
 * clobber across projects.
 */
export const apiRootTestConfig = {
  // Multiple reporters for better visibility. The CI legs override this with
  // `--reporter=blob` on the CLI so the coverage job can merge the results.
  reporters: process.env.CI ? ["default", "html"] : ["verbose", "html"],
  // Kept outside ./coverage to avoid clobbering the coverage report directory
  // under vitest 4.1+, which now refuses to copy the report into a subdirectory
  // of itself.
  outputFile: {
    html: "./vitest-report/index.html",
  },
  teardownTimeout: 10000,
} as const;

/**
 * Coverage config for the apps/api suite, applied at the ROOT config's
 * `test.coverage` (projects mode merges coverage across every project into one
 * report before thresholds are checked). Thresholds are 0 here; the real gate
 * (90% for lines, statements, functions, and branches) is passed by flag only at the
 * merge/gate step (see `coverageThresholds` above).
 */
export const apiCoverageConfig = {
  enabled: true,
  provider: "v8" as const,
  // Multiple reporters for comprehensive coverage view
  reporter: ["text", "text-summary", "json", "json-summary", "html", "lcov"],
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
  reportsDirectory: "./coverage",
  clean: true,
  cleanOnRerun: true,
};
