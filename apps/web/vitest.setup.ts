// Global test setup for apps/web. Registers @testing-library/jest-dom's custom
// matchers (toBeInTheDocument, toHaveTextContent, …) against Vitest's `expect`.
// @testing-library/react auto-runs cleanup() after each test because Vitest's
// globals (`afterEach`) are enabled in vitest.config.ts.
import "@testing-library/jest-dom/vitest";

// jsdom in this environment provides sessionStorage but not localStorage, so any
// module that touches window.localStorage — even at import time, e.g.
// stores/sidebarStore.ts and hooks/useChatbotSize.ts — would throw. Install a
// minimal in-memory localStorage when it's missing. Setup files run before each
// test file's imports, so this is in place before those modules evaluate.
if (typeof window !== "undefined") {
  const win = window as Window & { localStorage?: Storage };
  if (!win.localStorage) {
    const store = new Map<string, string>();
    const memoryStorage: Storage = {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key) => store.get(key) ?? null,
      key: (index) => [...store.keys()][index] ?? null,
      removeItem: (key) => {
        store.delete(key);
      },
      setItem: (key, value) => {
        store.set(key, String(value));
      },
    };
    Object.defineProperty(window, "localStorage", {
      value: memoryStorage,
      configurable: true,
    });
  }
}
