export const STALE_TIME_MS = 1000 * 60 * 5; // 5 minutes
export const CALCULATOR_YEARS_RANGE_FROM_CURRENT = 5;
export const REFETCH_INTERVAL_MS = 1000 * 60 * 5; // 5 minutes
export const DASHBOARD_YEARS_RANGE_FROM_CURRENT = 10;
export const SIDEBAR_WIDTH = 270; // in pixels

export const MAX_FILE_UPLOAD_SIZE_MB = 20; // 20 MB

export const DEFAULT_SEARCH_DEBOUNCE_MS = 300;

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

export const INPUT_DECIMAL_SCALE = 4;

export const DEFAULT_EMPTY_VALUE = "—";

// Re-exported from shared package
export { CUSTOM_FACTOR_SOURCES } from "@repo/utils";
