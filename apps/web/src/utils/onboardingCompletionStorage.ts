import {
  OnboardingKey,
  OnboardingKeys,
  OnboardingKeySchema,
} from "@repo/types";

/**
 * Browser-local mirror of onboarding completion for onboardings that can be
 * reached WITHOUT a session (the emission calculator is anonymous by design).
 *
 * The DB (via GET /users/me) is the cross-device source of truth; this local
 * layer only covers the anonymous window where the DB is unreachable, and is
 * merged into the DB on the next login (see useMergeOnboardingCompletionsOnLogin).
 *
 * Accepted residual (documented, not handled on purpose): anonymous → anonymous
 * on the same browser with no session event in between (person A never logs in,
 * leaves; person B arrives anonymous) → B may inherit A's dismissed hint. Low
 * risk (an explanatory popover, not data) and inherent to anonymous storage.
 */

// One localStorage item per key: `${PREFIX}${key}`. Onboarding keys themselves
// contain colons (e.g. "emission-capture:expert-mode"), so the suffix is
// recovered by slicing PREFIX.length — never by split(":").
const PREFIX = "huella-latam:onboarding-complete:v1:";

/**
 * Onboardings reachable while anonymous, and therefore the only ones allowed in
 * the local layer. `welcome-home` is intentionally excluded: it gates the
 * authenticated home, so it is DB-only.
 */
export const ANONYMOUS_REACHABLE_KEYS: ReadonlySet<OnboardingKey> = new Set([
  OnboardingKeys.EMISSION_CAPTURE_EXPERT_MODE,
]);

/**
 * Every locally-recorded completion. Scans localStorage by prefix and validates
 * each suffix with OnboardingKeySchema; unknown/forward-compat suffixes are
 * ignored but left in place. Any storage failure (private mode, disabled)
 * degrades to an empty set rather than throwing.
 */
export const readLocalCompletions = (): Set<OnboardingKey> => {
  const completed = new Set<OnboardingKey>();
  if (typeof window === "undefined") return completed;
  try {
    const { localStorage } = window;
    for (let i = 0; i < localStorage.length; i += 1) {
      const storageKey = localStorage.key(i);
      if (!storageKey || !storageKey.startsWith(PREFIX)) continue;
      // Recover the onboarding key by slicing off the prefix — keys contain ":".
      const parsed = OnboardingKeySchema.safeParse(
        storageKey.slice(PREFIX.length)
      );
      if (parsed.success) completed.add(parsed.data);
    }
  } catch {
    return new Set<OnboardingKey>();
  }
  return completed;
};

/** Record one completion locally. No-ops on any storage failure. */
export const markLocalCompleted = (key: OnboardingKey): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${PREFIX}${key}`, "1");
  } catch {
    // Private mode / quota — a lost local write just means the hint may reappear
    // until completed again; not worth surfacing.
  }
};

/**
 * Remove the local items for the given keys. Used after a successful login merge
 * to prune every key now confirmed in the DB.
 */
export const clearLocalKeys = (keys: Iterable<OnboardingKey>): void => {
  if (typeof window === "undefined") return;
  try {
    for (const key of keys) {
      window.localStorage.removeItem(`${PREFIX}${key}`);
    }
  } catch {
    // Ignore — see markLocalCompleted.
  }
};
