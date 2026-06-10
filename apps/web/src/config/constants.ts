import { API_BASE_URL } from "./environment";

/**
 * Default `staleTime` for TanStack Query hooks. Cached query data is considered
 * fresh for this long before TanStack will refetch on focus / mount.
 */
export const STALE_TIME_MS = 1000 * 60 * 5; // 5 minutes

/**
 * Number of past years (counting back from the current year) offered as options
 * in the carbon inventory business-profiling year selector.
 */
export const CALCULATOR_YEARS_RANGE_FROM_CURRENT = 5;

/**
 * Default `refetchInterval` for TanStack Query hooks that need to keep their
 * data fresh in the background (typically admin lists/KPIs that change while
 * the page is open).
 */
export const REFETCH_INTERVAL_MS = 1000 * 60 * 5; // 5 minutes

/**
 * Number of past years (counting back from the current year) offered as
 * options in the admin dashboard's year selector.
 */
export const DASHBOARD_YEARS_RANGE_FROM_CURRENT = 10;

/** Sidebar width in pixels. Drives layout offsets in `MainLayout` and `MaintainerLayout`. */
export const SIDEBAR_WIDTH = 280;
export const SIDEBAR_MINI_WIDTH = 72;

/** Default debounce delay (ms) for fuzzy-search inputs in `useFuzzySearch`. */
export const DEFAULT_SEARCH_DEBOUNCE_MS = 300;

/**
 * Number of past years (counting back from the current year) offered as
 * options in the public transparency screen.
 */
export const TRANSPARENCY_YEARS_RANGE_FROM_CURRENT = 5;

/**
 * BCP 47 language tag used for all number, date, and currency formatting in
 * the web app. Resolved by `Intl.NumberFormat` / `Intl.DateTimeFormat` and
 * also drives the separators consumed by `react-number-format` inputs.
 *
 * Common values:
 *   "es-ES" — Spanish (Spain)         — "1.234,56"
 *   "es-CL" — Spanish (Chile)         — "1.234,56"
 *   "es-MX" — Spanish (Mexico)        — "1,234.56"
 *   "en-US" — English (United States) — "1,234.56"
 *   "pt-BR" — Portuguese (Brazil)     — "1.234,56"
 *
 * Full list of valid tags: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#locales_argument
 * Underlying spec (BCP 47 / IETF language tags): https://www.iana.org/assignments/language-subtag-registry
 */
export const APP_LOCALE = "es-ES";

/**
 * Maximum number of decimal places accepted by `<NumericInput />` (passed to
 * `react-number-format`'s `decimalScale`). Independent from display precision.
 */
export const INPUT_DECIMAL_SCALE = 4;

/**
 * Default placeholder rendered by the Formatter when a value is `null`,
 * `undefined`, `NaN`, or an empty string. Per-call override via the `ifEmpty`
 * option.
 */
export const DEFAULT_EMPTY_VALUE = "—";

/**
 * Cap used by the Formatter for adaptive precision on small numeric values.
 * Below `10^(-MAX_DISPLAY_DECIMALS)`, the formatter falls back to a `<X` /
 * `>-X` label so a tiny non-zero value isn't shown as `0`.
 */
export const MAX_DISPLAY_DECIMALS = 6;

/**
 * Stable, never-expiring public URL that streams the current Terms & Conditions
 * PDF directly from the API (which proxies the bytes from Azure Blob Storage).
 *
 * Rendered as the link target on the public landing page footer. The URL is
 * intentionally fixed: a new T&C upload swaps the underlying file behind it
 * without changing the URL itself, so this link never has to be updated when
 * the document is replaced.
 *
 * `API_BASE_URL` is sourced from an environment variable (`VITE_API_BASE_URL`)
 * and may legitimately be configured with a trailing slash. We strip any
 * trailing slashes before concatenation so the resulting URL never contains
 * a `//` between the base and the path.
 */
const API_BASE_URL_NORMALIZED = API_BASE_URL.replace(/\/+$/, "");
export const TERMS_CONDITIONS_FILE_URL = `${API_BASE_URL_NORMALIZED}/terms-conditions/file`;

// Re-exported from shared package
export { CUSTOM_FACTOR_SOURCES } from "@repo/utils";
