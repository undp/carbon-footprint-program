import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Obtener __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    tsconfigPaths({
      root: __dirname,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.{js,ts}"],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    pool: "threads",
    maxWorkers: 1,
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
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.example.ts",
      ],
    },
  },
});
