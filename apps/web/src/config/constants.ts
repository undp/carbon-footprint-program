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

/**
 * Default and minimum dimensions of the floating chatbot panel.
 *
 * The widget is anchored to the bottom-right corner and resized from the
 * top-left handle. Persisted user sizes are clamped to the min bounds below
 * on read and to the live viewport on render — see `useChatbotSize`.
 */
export const CHATBOT_WIDGET_DEFAULT_WIDTH = 360;
export const CHATBOT_WIDGET_DEFAULT_HEIGHT = 480;
export const CHATBOT_WIDGET_MIN_WIDTH = 320;
export const CHATBOT_WIDGET_MIN_HEIGHT = 400;
export const CHATBOT_SIZE_KEY = "huella-latam:chatbot-size";

/**
 * Flips to `"true"` the first time the user acknowledges the chatbot
 * (minimizing it, sending a message, or starting a new conversation). The
 * landing page auto-opens the assistant on first ever visit; once this flag
 * is set, the auto-open is suppressed on subsequent visits.
 */
export const CHATBOT_INTRODUCED_KEY = "huella-latam:chatbot-introduced";

/**
 * Client-side safety nets for a streaming chat turn so a stalled connection
 * can't pin the widget in `loading`/`streaming` forever (both states disable
 * send + new-conversation, leaving a full page reload as the only escape).
 * Both abort the per-turn `AbortController` in `useChatStream`.
 *
 * `CHATBOT_STREAM_IDLE_TIMEOUT_MS` fires when no frame arrives within the
 * window; `CHATBOT_STREAM_OVERALL_TIMEOUT_MS` bounds total turn duration.
 */
export const CHATBOT_STREAM_IDLE_TIMEOUT_MS = 30_000;
export const CHATBOT_STREAM_OVERALL_TIMEOUT_MS = 120_000;

/** Maximum file size accepted by `<FileUpload />`, in megabytes. */
export const MAX_FILE_UPLOAD_SIZE_MB = 20;

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
 *
 * This is the app-wide default for every decimal `NumericInput`, with two
 * deliberate exceptions: `FormNumericField` forces `0` when `onlyInteger` is
 * set, and the emission-factor cell passes `FACTOR_INPUT_DECIMAL_SCALE` (see
 * below for why the two scales differ).
 */
export const INPUT_DECIMAL_SCALE = 4;

/**
 * Decimal places accepted by the emission-factor input (own factors only).
 *
 * Matches the `Decimal(28,10)` column that stores the factor, so a factor the
 * user types or pastes is never silently truncated on the way in. It differs
 * from `INPUT_DECIMAL_SCALE` on purpose: raising the global scale would change
 * quantities, reduction-scenario inputs and every other numeric form, while
 * the truncation problem only exists for factors.
 */
export const FACTOR_INPUT_DECIMAL_SCALE = 10;

/**
 * Display precision of an emission factor: the formatter targets
 * `FACTOR_DISPLAY_SIGNIFICANT_DIGITS` significant digits, bounded by a floor
 * and a ceiling of decimal places.
 *
 * The floor is a no-regression guarantee against the previous 2-decimal
 * format: no factor may ever be shown with less precision than before, so a
 * value like `1164,4894` keeps 2 decimals (`1.164,49`) instead of collapsing
 * to 4 significant digits. The ceiling preserves the existing `<0,000001`
 * threshold label instead of rendering `0,000000`; the untruncated value stays
 * reachable through the exact-value affordance.
 *
 * Floor and ceiling therefore take precedence over the significant-digit
 * target — that is the intended behaviour, not a rounding bug to "fix".
 */
export const FACTOR_DISPLAY_SIGNIFICANT_DIGITS = 4;
export const FACTOR_DISPLAY_MIN_DECIMALS = 2;
export const FACTOR_DISPLAY_MAX_DECIMALS = 6;

/**
 * Thresholds of the adaptive mass scale used for the main-activity emission
 * intensity (tCO₂e per unit of activity). The unit is picked so the presented
 * number lands in `[1, 1000)`: at or above `INTENSITY_TON_THRESHOLD_T` it is
 * shown in tonnes, at or above `INTENSITY_KG_THRESHOLD_T` in kilograms, and
 * below that in grams.
 *
 * `INTENSITY_MIN_DISPLAY_G` is the gram floor: a positive rate below it is
 * shown as `<0,01 gCO₂e` rather than as a number it does not reach. The
 * comparison is made on the raw value, before rounding — otherwise `0,0075 g`
 * would round up into a displayable `0,01 g`.
 *
 * Scoped to the equivalence card and the step-4 caption only — totals,
 * rankings and the transparency portal stay in tCO₂e for comparability.
 */
export const INTENSITY_TON_THRESHOLD_T = 1;
export const INTENSITY_KG_THRESHOLD_T = 0.001;
export const INTENSITY_MAX_DECIMALS = 2;
export const INTENSITY_MIN_DISPLAY_G = 0.01;

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

/**
 * Contact address shown on the landing footer for organizations that want to
 * replicate the platform in their own country. Each deployment points this at
 * its own contact (a program focal point, a shared inbox), so it lives here
 * instead of being embedded in the footer copy.
 */
export const REPLICATION_CONTACT_EMAIL = "valeria.correa@undp.org";

/** Folder name (within the carbon-inventory ZIP) that bundles line file attachments. */
export const CARBON_INVENTORY_ZIP_FILES_DIR = "archivos";

/** Filename of the inventory emissions workbook at the ZIP root. */
export const CARBON_INVENTORY_ZIP_EXCEL_ENTRY_NAME = "resumen-emisiones.xlsx";

/** Filename of the methodology workbook at the ZIP root. */
export const CARBON_INVENTORY_ZIP_METHODOLOGY_ENTRY_NAME = "metodologia.xlsx";

/** Filename of the human-readable README at the ZIP root. */
export const CARBON_INVENTORY_ZIP_README_ENTRY_NAME = "LEEME.txt";

/**
 * The escape hatch of an open-ended emission-factor dimension: the value a user
 * picks when no listed option matches their real-world item, declaring the line
 * with a custom factor source instead of abandoning it.
 *
 * `masculineSingular` is the wording the seed writes. The other three are
 * recognised, not written: the dimensions maintainer accepts any variable name,
 * so a catalog curated after the seed — or by a country deployment — can spell
 * it in the plural, or in the feminine when the dimension reads that way.
 * Add a wording here and every screen that asks "is this the escape hatch?"
 * follows.
 */
export const EMISSION_FACTOR_DIMENSION_OTHER = {
  masculineSingular: "Otro",
  masculinePlural: "Otros",
  feminineSingular: "Otra",
  femininePlural: "Otras",
} as const;

/**
 * Every wording above, as the list the capture dropdown pins last. Derived, so
 * it cannot drift from the object.
 *
 * Matching ignores case and surrounding spaces and covers the whole value, so
 * only standalone wordings belong here — never a prefix such as "Otro proceso"
 * or "Otro país", which are real catalog values with their own emission factor
 * and keep their alphabetical position.
 */
export const EMISSION_FACTOR_DIMENSION_OTHER_VALUES = Object.values(
  EMISSION_FACTOR_DIMENSION_OTHER
);

// Re-exported from shared package
export { CUSTOM_FACTOR_SOURCES } from "@repo/utils";
