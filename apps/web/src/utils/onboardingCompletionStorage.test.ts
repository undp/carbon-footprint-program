import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingKeys } from "@repo/types";
import {
  ANONYMOUS_REACHABLE_KEYS,
  clearLocalKeys,
  markLocalCompleted,
  readLocalCompletions,
} from "./onboardingCompletionStorage";

// Mirrors the module's private PREFIX (versioned on purpose). Duplicated here
// only to build raw items for the ignore/round-trip cases; if the module bumps
// the version this test should be updated alongside it.
const PREFIX = "huella-latam:onboarding-complete:v1:";
const KEY = OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE;

// The working localStorage installed by vitest.setup.ts, restored after any test
// that swaps in a throwing one. (jsdom implements Storage exotically, so spying a
// single method is unreliable — swap the whole object instead.)
const REAL_LOCAL_STORAGE = window.localStorage;
const setLocalStorage = (value: Storage) =>
  Object.defineProperty(window, "localStorage", { value, configurable: true });

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  setLocalStorage(REAL_LOCAL_STORAGE);
  vi.restoreAllMocks();
});

describe("onboardingCompletionStorage", () => {
  it("round-trips a completion through write → read despite the colon-laden prefix", () => {
    expect(readLocalCompletions().has(KEY)).toBe(false);

    markLocalCompleted(KEY);

    // The stored key embeds the prefix's colons, so recovery must slice by
    // prefix length — split(":") would truncate it. This asserts recovery
    // survives the colons.
    const storedKey = window.localStorage.key(0);
    expect(storedKey).toBe(`${PREFIX}${KEY}`);
    expect(storedKey?.split(":").length).toBeGreaterThan(1);
    expect(readLocalCompletions()).toEqual(new Set([KEY]));
  });

  it("clears exactly the given keys", () => {
    markLocalCompleted(KEY);
    expect(readLocalCompletions().has(KEY)).toBe(true);

    clearLocalKeys([KEY]);

    expect(readLocalCompletions().has(KEY)).toBe(false);
    expect(window.localStorage.length).toBe(0);
  });

  it("ignores non-prefixed items and prefixed-but-unknown suffixes", () => {
    window.localStorage.setItem("unrelated-key", "1");
    window.localStorage.setItem(`${PREFIX}not-a-real-onboarding`, "1");
    markLocalCompleted(KEY);

    // Only the schema-valid key is recovered; the others are left in place
    // (forward-compat) but not returned.
    expect(readLocalCompletions()).toEqual(new Set([KEY]));
    expect(window.localStorage.getItem("unrelated-key")).toBe("1");
  });

  it("degrades to an empty set when reading localStorage throws", () => {
    setLocalStorage({
      get length(): number {
        throw new Error("blocked (e.g. private mode)");
      },
      key: () => {
        throw new Error("blocked");
      },
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    } as unknown as Storage);

    expect(() => readLocalCompletions()).not.toThrow();
    expect(readLocalCompletions()).toEqual(new Set());
  });

  it("no-ops (does not throw) when a write throws", () => {
    setLocalStorage({
      setItem: () => {
        throw new Error("quota exceeded");
      },
      getItem: () => null,
      key: () => null,
      removeItem: () => {},
      clear: () => {},
      get length(): number {
        return 0;
      },
    } as unknown as Storage);

    expect(() => markLocalCompleted(KEY)).not.toThrow();
  });

  it("allow-lists exactly the anonymous-reachable keys", () => {
    // Guards the invariant the hooks rely on: welcome-home stays DB-only.
    expect(ANONYMOUS_REACHABLE_KEYS.has(KEY)).toBe(true);
    expect(ANONYMOUS_REACHABLE_KEYS.has(OnboardingKeys.WELCOME_HOME)).toBe(
      false
    );
  });
});
