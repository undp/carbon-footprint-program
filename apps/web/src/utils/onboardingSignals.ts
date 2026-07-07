/**
 * One-shot, cross-screen hint for the home onboarding flow. Each step button on
 * the home navigates to the relevant page and leaves a "focus" target here
 * (via sessionStorage, not the URL — it is a transient hint, not bookmarkable
 * state) so the destination screen can spotlight the exact control to click.
 */
export type OnboardingFocus =
  | "create-org"
  | "solicit-inscription"
  | "new-huella"
  | "self-declare";

const FOCUS_KEY = "onboarding:focus";

/** Mark which control the next screen should spotlight on arrival. */
export const markOnboardingFocus = (target: OnboardingFocus) => {
  window.sessionStorage.setItem(FOCUS_KEY, target);
};

/** Read-and-clear the focus target (one-shot; null when none pending). */
export const consumeOnboardingFocus = (): OnboardingFocus | null => {
  const value = window.sessionStorage.getItem(FOCUS_KEY);
  if (value) window.sessionStorage.removeItem(FOCUS_KEY);
  return (value as OnboardingFocus | null) ?? null;
};
