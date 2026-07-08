import { driver } from "driver.js";
import "driver.js/dist/driver.css";

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
}

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
    tour.destroy();
  };

  const attempt = () => {
    const element = spec.find();
    if (element) {
      target = element;
      element.addEventListener("click", onTargetClick, { once: true });
      tour.highlight({
        element,
        popover: { title: spec.title, description: spec.description },
      });
    } else if (attempts < 25) {
      attempts += 1;
      timer = setTimeout(attempt, 200);
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

/** Resolver: first visible button whose text contains `text` (case-insensitive). */
export const findButtonByText = (text: string) => (): HTMLElement | null => {
  const needle = text.trim().toLowerCase();
  return (
    Array.from(document.querySelectorAll<HTMLElement>("button")).find(
      (button) =>
        // offsetParent is null while hidden (display:none anywhere in the tree).
        button.offsetParent !== null &&
        (button.textContent ?? "").trim().toLowerCase().includes(needle)
    ) ?? null
  );
};

/** Resolver: first element matching a CSS selector. */
export const findBySelector = (selector: string) => (): HTMLElement | null =>
  document.querySelector<HTMLElement>(selector);

/**
 * Resolver: the sidebar navigation link for a route path. Used to guide the
 * user to navigate themselves — we spotlight the menu item so they click it,
 * instead of redirecting the route programmatically.
 */
export const findSidebarLink = (path: string) => (): HTMLElement | null =>
  document.querySelector<HTMLElement>(`a[href="${path}"]`);
