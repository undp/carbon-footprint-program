// Global test setup for apps/web. Registers @testing-library/jest-dom's custom
// matchers (toBeInTheDocument, toHaveTextContent, …) against Vitest's `expect`.
// @testing-library/react auto-runs cleanup() after each test because Vitest's
// globals (`afterEach`) are enabled in vitest.config.ts.
import "@testing-library/jest-dom/vitest";
