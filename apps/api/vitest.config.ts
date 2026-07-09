import { defineApiVitestConfig } from "./vitest.shared.js";

// Default config: runs the full apps/api test suite (every file, including the
// storage-dependent ones). This is what bare `vitest` / `vitest --ui` load; the
// segmented CI legs use vitest.base.config.ts + vitest.storage.config.ts.
export default defineApiVitestConfig();
