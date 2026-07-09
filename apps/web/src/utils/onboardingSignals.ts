/**
 * One-shot, cross-screen hint for the home onboarding flow. Each step button on
 * the home navigates to the relevant page and leaves a "focus" target here
 * (via sessionStorage, not the URL — it is a transient hint, not bookmarkable
 * state) so the destination screen can spotlight the exact control to click.
 */
export type OnboardingFocus =
  "create-org" | "solicit-inscription" | "new-huella" | "self-declare";

const FOCUS_KEY = "onboarding:focus";

/** Mark which control the next screen should spotlight on arrival. */
export const markOnboardingFocus = (target: OnboardingFocus) => {
  window.sessionStorage.setItem(FOCUS_KEY, target);
};

/** Read the pending focus without clearing it (null when none pending). */
export const peekOnboardingFocus = (): OnboardingFocus | null =>
  (window.sessionStorage.getItem(FOCUS_KEY) as OnboardingFocus | null) ?? null;

/**
 * Consume the pending focus only if it is one this screen actually handles.
 * Returns and clears the key when the stored focus is in `expected`; otherwise
 * returns null and leaves it pending, so a focus meant for another screen
 * survives when the user lands somewhere else first (peek-then-consume-on-match).
 */
export const consumeOnboardingFocus = (
  expected: OnboardingFocus[]
): OnboardingFocus | null => {
  const value = peekOnboardingFocus();
  if (value && expected.includes(value)) {
    window.sessionStorage.removeItem(FOCUS_KEY);
    return value;
  }
  return null;
};

/** Drop a pending focus that the user chose not to follow, so it doesn't
 *  resurface as a surprise highlight on a later organic visit. */
export const clearOnboardingFocus = () => {
  window.sessionStorage.removeItem(FOCUS_KEY);
};
