import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Obtener __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const coverageThresholds =
  // TODO: review these thresholds in the future and adjust as needed.
  // eslint-disable-next-line no-constant-condition
  process.env.CI || true
    ? { lines: 0, functions: 0, branches: 0, statements: 0 }
    : { lines: 80, functions: 80, branches: 80, statements: 80 };

export default defineConfig({
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
    include: ["test/**/*.{test,spec}.{js,ts}"],
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
      // More detailed reporting
      reportsDirectory: "./coverage",
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
