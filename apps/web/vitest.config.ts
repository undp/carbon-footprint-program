import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Standalone Vitest config for apps/web. It deliberately does NOT reuse
// vite.config.ts: that config throws when VITE_API_BASE_URL is unset (a guard
// for real builds) and pulls in the dev proxy / router codegen plugins, none of
// which a unit test needs. The path aliases below mirror vite.config.ts so test
// imports resolve `@/...` the same way the app does.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@screens": path.resolve(__dirname, "./src/screens"),
      "@assets": path.resolve(__dirname, "./src/assets"),
      "@icons": path.resolve(__dirname, "./src/icons"),
      "@interfaces": path.resolve(__dirname, "./src/interfaces"),
    },
  },
  test: {
    // jsdom (not node): app modules read browser globals at import time — e.g.
    // src/config/environment.ts touches window.location.origin — so tests need
    // a DOM even when the unit under test is a plain hook.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
    // Provide the VITE_* env the app expects so environment.ts resolves cleanly
    // and doesn't log its "OIDC not configured" boot error into test output.
    // Values are throwaway — no test should depend on them.
    env: {
      VITE_API_BASE_URL: "http://localhost/api",
      VITE_OIDC_ISSUER: "http://localhost/oidc",
      VITE_OIDC_CLIENT_ID: "test-client",
      VITE_OIDC_SCOPES: "openid",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/**/*.d.ts",
        "src/**/*.gen.ts",
        "src/main.tsx",
        "src/routeTree.gen.ts",
      ],
      // Low global floor set just below the current level (lines ~4.87%,
      // statements ~4.96%, functions ~2.62%, branches ~5.1% — the Wave 1
      // pure-function util tests plus the getApiErrorMessage tests already on
      // main via #508). This is a regression guard, not a coverage target:
      // `coverage.all` counts every file under `include`, so the percentages
      // are global and the app is ~98% untested UI. The floor prevents
      // backsliding and should keep being ratcheted UP as the logic layers
      // (utils/, hooks/, stores/, components/Chatbot/) gain tests — raise
      // coverage, don't just bump the number. The headroom below current
      // absorbs an unrelated untested feature landing without tripping the gate.
      thresholds: {
        lines: 4.5,
        statements: 4.5,
        functions: 2.3,
        branches: 4.5,
      },
    },
  },
});
