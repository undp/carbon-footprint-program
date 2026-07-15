import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSidebarStore } from "./sidebarStore";

// Mirror the persistence key from sidebarStore.ts so a key rename trips a test.
const SIDEBAR_PINNED_KEY = "huella-latam:sidebar-pinned";

// The store is a module singleton whose `isPinned` was read from localStorage
// once at import time (empty jsdom storage → false). Reset both the persisted
// value and the in-memory state before each case.
beforeEach(() => {
  localStorage.clear();
  useSidebarStore.setState({ isPinned: false, isForcedOpen: false });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSidebarStore", () => {
  it("togglePin flips isPinned and persists it", () => {
    useSidebarStore.getState().togglePin();

    expect(useSidebarStore.getState().isPinned).toBe(true);
    expect(localStorage.getItem(SIDEBAR_PINNED_KEY)).toBe("true");
  });

  it("togglePin toggles back off and persists false", () => {
    useSidebarStore.getState().togglePin(); // → true
    useSidebarStore.getState().togglePin(); // → false

    expect(useSidebarStore.getState().isPinned).toBe(false);
    expect(localStorage.getItem(SIDEBAR_PINNED_KEY)).toBe("false");
  });

  it("setForcedOpen toggles the forced-open flag", () => {
    useSidebarStore.getState().setForcedOpen(true);
    expect(useSidebarStore.getState().isForcedOpen).toBe(true);

    useSidebarStore.getState().setForcedOpen(false);
    expect(useSidebarStore.getState().isForcedOpen).toBe(false);
  });

  it("hydrates isPinned=true from a persisted 'true' at creation time", async () => {
    // readPinned() runs when the module is first evaluated, so seed storage and
    // re-import a fresh module to exercise the `=== "true"` true branch.
    vi.resetModules();
    localStorage.setItem(SIDEBAR_PINNED_KEY, "true");

    const { useSidebarStore: freshStore } = await import("./sidebarStore");

    expect(freshStore.getState().isPinned).toBe(true);
  });

  it("defaults isPinned=false when there is no window (SSR guard)", async () => {
    vi.resetModules();
    vi.stubGlobal("window", undefined);

    const { useSidebarStore: freshStore } = await import("./sidebarStore");

    expect(freshStore.getState().isPinned).toBe(false);
  });
});
