import path from "node:path";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig, defineProject } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { STORAGE_TEST_MANIFEST } from "./test/setup/storageTestManifest.js";

// __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Default test glob — the full apps/api suite. */
const DEFAULT_TEST_INCLUDE = ["test/**/*.{test,spec}.{js,ts}"];

/**
 * The apps/api coverage gate — 90% for every metric — declared here, where it is
 * read, as the single source of truth. It applies to any full run (all three
 * projects, or the merged blobs). The ONLY run that opts out is `test:leg`, which
 * runs ONE project whose partial coverage would never clear 90; it overrides
 * these to 0 on the CLI (see package.json).
 */
const COVERAGE_GATE = 90;

/**
 * Environment shared by every project. The storage-provider vars are added per
 * project (see `storageEnv`), because each project targets a different provider.
 * `test.env` is applied inside each worker, so it isolates the three projects
 * cleanly even when they run in a single command.
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
  // Neutralize ambient .envrc/direnv JWKS_* leakage so local runs match CI.
  JWKS_ISSUER: "",
  JWKS_URI: "",
  JWKS_AUDIENCE: "",
} as const;

// Dummy storage env per project. These only satisfy `buildStorageConfig()`
// validation at `app.ready()`; the real adapter is built from the injected
// `storageDescriptor` (see test/factories/appFactory.ts). globalSetup.ts picks
// the provider — and boots the matching testcontainer — from the project NAME,
// not from these vars, so the three projects stay isolated even in a single run.
const AZURE_TEST_ENV = {
  STORAGE_PROVIDER: "azure_blob_storage",
  AZURE_STORAGE_ACCOUNT_NAME: "devstoreaccount1",
  AZURE_STORAGE_CONTAINER_NAME: "test-files",
};

const MINIO_TEST_ENV = {
  STORAGE_PROVIDER: "minio",
  MINIO_ENDPOINT: "http://localhost:9000",
  MINIO_ACCESS_KEY: "minioadmin",
  MINIO_SECRET_KEY: "minioadmin",
  MINIO_BUCKET: "test-files",
  MINIO_REGION: "us-east-1",
};

interface ApiVitestProjectOverrides {
  /**
   * Project name. MUST be one of the names `globalSetup.ts` maps to a storage
   * provider (`base`, `storage-azure`, `storage-minio`): it drives `--project`
   * filtering in CI, the provider selection in globalSetup, AND the branch-
   * protection check name. Do not rename without updating all three.
   */
  name: string;
  /** `test.include` override; defaults to the full suite. */
  include?: string[];
  /** Extra `test.exclude` globs, appended to Vitest's defaults. */
  exclude?: string[];
  /** Provider-selection dummies for `buildStorageConfig()` validation. */
  storageEnv: Record<string, string>;
}

/**
 * Builds one apps/api Vitest project. Every project shares everything except its
 * name, its `include`/`exclude`, and its storage-provider env. `defineProject`
 * types the returned object so a stray or root-only key fails HERE at the
 * definition, not silently at runtime — root-only options (coverage, reporters,
 * outputFile, teardownTimeout) are set once on the root `test` below, never here.
 */
function defineApiVitestProject(overrides: ApiVitestProjectOverrides) {
  return defineProject({
    plugins: [tsconfigPaths({ root: __dirname })],
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
      // Append to (never replace) Vitest's defaults — dropping
      // `configDefaults.exclude` would let node_modules/dist leak in.
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
      env: { ...SHARED_TEST_ENV, ...overrides.storageEnv },
    },
  });
}

// One config, three projects that partition the suite into disjoint sets:
//   - base:          the full suite EXCEPT the storage manifest — the bulk.
//   - storage-azure: ONLY the storage manifest, against Azurite.
//   - storage-minio: ONLY the storage manifest, against MinIO.
// base ∪ storage-* == the full suite. The storage manifest
// (test/setup/storageTestManifest.ts) is the single source of truth for both the
// base `exclude` and the storage `include`; `test:verify-storage-manifest` guards
// it against drift.
//
// Coverage, reporters, outputFile, and teardownTimeout are root-only (Vitest's
// `NonProjectOptions`): ignored inside a project, so they live here once for the
// whole run. With a single reporter run, one HTML path can't clobber across
// projects.
//
// The coverage gate (COVERAGE_GATE below) lives in `test.coverage.thresholds`,
// applied to any full run. A per-project run can't be gated on its partial view,
// so `test:leg` (one `--project`) overrides the thresholds to 0 on the CLI — the
// single opt-out, stated where it happens. Two run modes, same coverage by
// construction:
//   - Local: `vitest run --coverage` runs all three projects and merges their
//     coverage (v8 hit-counts) in one pass, then applies the gate — one command.
//   - CI:    each leg runs `--project=<leg> --coverage --reporter=blob` (gate
//     off); the `coverage` job merges the blobs with `--merge-reports --coverage`
//     and applies the gate. Keeps the matrix's wall-clock; still no script.
export default defineConfig({
  test: {
    // Multiple reporters for better visibility. The CI legs override this with
    // `--reporter=blob` on the CLI so the coverage job can merge the results.
    reporters: process.env.CI ? ["default", "html"] : ["verbose", "html"],
    // Kept outside ./coverage to avoid clobbering the coverage report directory
    // under vitest 4.1+, which refuses to copy the report into a subdirectory of
    // itself.
    outputFile: { html: "./vitest-report/index.html" },
    teardownTimeout: 10000,
    projects: [
      defineApiVitestProject({
        name: "base",
        exclude: [...STORAGE_TEST_MANIFEST],
        storageEnv: AZURE_TEST_ENV,
      }),
      defineApiVitestProject({
        name: "storage-azure",
        include: [...STORAGE_TEST_MANIFEST],
        storageEnv: AZURE_TEST_ENV,
      }),
      defineApiVitestProject({
        name: "storage-minio",
        include: [...STORAGE_TEST_MANIFEST],
        storageEnv: MINIO_TEST_ENV,
      }),
    ],
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
      // The gate. `test:leg` (single-project, partial view) overrides these to 0.
      thresholds: {
        lines: COVERAGE_GATE,
        functions: COVERAGE_GATE,
        branches: COVERAGE_GATE,
        statements: COVERAGE_GATE,
      },
      reportsDirectory: "./coverage",
      clean: true,
      cleanOnRerun: true,
    },
  },
});
