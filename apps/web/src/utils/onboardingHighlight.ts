import { driver, type Popover } from "driver.js";
import "driver.js/dist/driver.css";
import { IS_DEVELOPMENT } from "@/config/environment";
import { OnboardingFocus } from "./onboardingSignals";

// Re-exported so the onboarding-target API (id type + tagging helper +
// resolver) can be imported from a single module.
export type { OnboardingFocus } from "./onboardingSignals";

export interface HighlightSpec {
  /** Resolve the element to spotlight; retried until it appears. */
  find: () => HTMLElement | null;
  title: string;
  description: string;
  /** Delay before the first attempt, ms (default 300). Raise it to wait out an
   *  animation (e.g. the sidebar expanding) so the popover lands on the settled
   *  element rather than mid-transition. */
  delayMs?: number;
  /** Fires once when the highlight ends — on target click, close, or cleanup.
   *  Use it to undo any state set up for the highlight (e.g. force-open sidebar). */
  onDismiss?: () => void;
  /** Fires only when the user explicitly closes the popover (overlay / ✕ / Esc)
   *  without following the spotlighted control. */
  onUserClose?: () => void;
  /** Fires when the user follows the hint by clicking the spotlighted control
   *  (which self-destroys the tour). Distinct from onUserClose so a one-time
   *  hint can be marked seen on engagement, not only on explicit dismissal. */
  onFollow?: () => void;
  /** Opt-in: when set, the popover shows a single acknowledge button with this
   *  label (alongside the ✕). Clicking it closes the spotlight through the same
   *  explicit-close path as ✕/overlay/Esc, so `onUserClose` fires. Leave unset
   *  to keep the default buttonless spotlight (other callers rely on that). */
  confirmLabel?: string;
  /** Identifies the target in the dev-only warning emitted when it never
   *  resolves, so a contributor who breaks a target gets a signal, not silence. */
  debugLabel?: string;
}

/**
 * Attribute stamped on each control the home onboarding points at. Resolving by
 * this exact attribute is stable across copy/layout changes, unlike matching
 * button text or DataGrid-internal selectors. Single source of truth for both
 * the tagging helper and the resolver below.
 */
export const ONBOARDING_TARGET_ATTR = "data-onboarding-id" as const;

/** Spread onto the target control so the destination screen can find it. */
export const onboardingTargetProps = (
  id: OnboardingFocus
): Record<typeof ONBOARDING_TARGET_ATTR, OnboardingFocus> => ({
  [ONBOARDING_TARGET_ATTR]: id,
});

/**
 * Spotlight an element with a one-off driver.js highlight, polling until the
 * element renders (screens and data grids load async). Returns a cleanup that
 * clears the poll and destroys the highlight. No-ops silently if the element
 * never shows (e.g. the target button isn't available in the current state).
 */
export const runOnboardingHighlight = (spec: HighlightSpec): (() => void) => {
  let done = false;
  // destroy() is triggered by us (target click / effect cleanup) or by the user
  // closing the popover — only the latter counts as a user close.
  let selfDestroy = false;
  const finish = (userClosed: boolean) => {
    if (done) return;
    done = true;
    if (userClosed) spec.onUserClose?.();
    spec.onDismiss?.();
  };
  const tour = driver({
    allowClose: true,
    stagePadding: 6,
    onDestroyed: () => finish(!selfDestroy),
  });
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout>;
  let target: HTMLElement | null = null;
  // The spotlighted control opens a modal or navigates on click, which would
  // leave the popover orphaned — so dismiss the highlight along with it.
  const onTargetClick = () => {
    selfDestroy = true;
    spec.onFollow?.();
    tour.destroy();
  };

  const attempt = () => {
    const element = spec.find();
    if (element) {
      target = element;
      element.addEventListener("click", onTargetClick, { once: true });
      const popover: Popover = {
        title: spec.title,
        description: spec.description,
      };
      if (spec.confirmLabel) {
        // Show the acknowledge button (plus the ✕) and route its click through
        // destroy() → onDestroyed → finish(true) → onUserClose, exactly like an
        // explicit ✕/overlay/Esc close, so a one-time hint persists completion.
        popover.showButtons = ["next", "close"];
        popover.nextBtnText = spec.confirmLabel;
        popover.onNextClick = () => {
          tour.destroy();
        };
      }
      tour.highlight({ element, popover });
    } else if (attempts < 25) {
      attempts += 1;
      timer = setTimeout(attempt, 200);
    } else {
      // Poll exhausted: the target never rendered. No highlight was shown, so
      // driver's onDestroyed never fires — run finish() ourselves so onDismiss
      // still runs (e.g. releasing the forced-open sidebar) instead of leaking
      // that state until the component unmounts.
      if (IS_DEVELOPMENT) {
        // eslint-disable-next-line no-console
        console.warn(
          `[onboarding] highlight target${
            spec.debugLabel ? ` "${spec.debugLabel}"` : ""
          } never resolved after ${attempts} attempts; skipping spotlight.`
        );
      }
      finish(false);
    }
  };
  timer = setTimeout(attempt, spec.delayMs ?? 300);

  return () => {
    clearTimeout(timer);
    target?.removeEventListener("click", onTargetClick);
    selfDestroy = true;
    tour.destroy();
    // driver only fires onDestroyed while a highlight is active — make sure the
    // dismiss side effects also run when cleanup lands before the first show.
    finish(false);
  };
};

/** Resolver: first element matching a CSS selector. */
export const findBySelector = (selector: string) => (): HTMLElement | null =>
  document.querySelector<HTMLElement>(selector);

/** Resolver: the control tagged with `onboardingTargetProps(id)`. */
export const findOnboardingTarget = (id: OnboardingFocus) =>
  findBySelector(`[${ONBOARDING_TARGET_ATTR}="${id}"]`);

/**
 * Resolver: the sidebar navigation link for a route path. Used to guide the
 * user to navigate themselves — we spotlight the menu item so they click it,
 * instead of redirecting the route programmatically.
 */
export const findSidebarLink = (path: string) => (): HTMLElement | null =>
  document.querySelector<HTMLElement>(`a[href="${path}"]`);
