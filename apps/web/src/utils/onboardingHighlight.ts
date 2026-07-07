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
  /** Fires when the highlight is dismissed — on target click, close, or cleanup.
   *  Use it to undo any state set up for the highlight (e.g. force-open sidebar). */
  onDismiss?: () => void;
}

/**
 * Spotlight an element with a one-off driver.js highlight, polling until the
 * element renders (screens and data grids load async). Returns a cleanup that
 * clears the poll and destroys the highlight. No-ops silently if the element
 * never shows (e.g. the target button isn't available in the current state).
 */
export const runOnboardingHighlight = (spec: HighlightSpec): (() => void) => {
  const tour = driver({
    allowClose: true,
    stagePadding: 6,
    onDestroyed: () => spec.onDismiss?.(),
  });
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout>;
  let target: HTMLElement | null = null;
  const dismiss = () => tour.destroy();

  const attempt = () => {
    const element = spec.find();
    if (element) {
      target = element;
      // The spotlighted control opens a modal or navigates on click, which
      // would leave the popover orphaned — so dismiss the highlight on click.
      element.addEventListener("click", dismiss, { once: true });
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
    target?.removeEventListener("click", dismiss);
    tour.destroy();
  };
};

/** Resolver: first visible button whose text contains `text` (case-insensitive). */
export const findButtonByText = (text: string) => (): HTMLElement | null => {
  const needle = text.trim().toLowerCase();
  return (
    Array.from(document.querySelectorAll<HTMLElement>("button")).find(
      (button) =>
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
