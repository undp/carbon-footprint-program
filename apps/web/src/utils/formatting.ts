import {
  APP_LOCALE,
  DEFAULT_EMPTY_VALUE,
  FACTOR_DISPLAY_MAX_DECIMALS,
  FACTOR_DISPLAY_MIN_DECIMALS,
  FACTOR_DISPLAY_SIGNIFICANT_DIGITS,
  INPUT_DECIMAL_SCALE,
  INTENSITY_KG_THRESHOLD_T,
  INTENSITY_MAX_DECIMALS,
  INTENSITY_MIN_DISPLAY_G,
  INTENSITY_TON_THRESHOLD_T,
  MAX_DISPLAY_DECIMALS,
} from "@/config/constants";

const DEFAULT_MAX_FRACTION_DIGITS = 2;

/**
 * Upper bound accepted by `Intl.NumberFormat` for `maximumFractionDigits`.
 * Used to render a value with every digit it carries, i.e. without applying
 * any display rounding of our own.
 */
const EXACT_MAX_FRACTION_DIGITS = 20;

/** Emission intensity is stored as tCO₂e per unit of main activity. */
const KG_PER_TON = 1000;
const GRAMS_PER_TON = 1_000_000;

/**
 * Mass units of the adaptive intensity scale, ordered from largest to
 * smallest. `threshold` is expressed in tonnes and compared against the raw
 * rate; `perTon` converts the rate into the unit.
 */
const INTENSITY_SCALE = [
  { threshold: INTENSITY_TON_THRESHOLD_T, perTon: 1, unit: "t CO₂e" },
  { threshold: INTENSITY_KG_THRESHOLD_T, perTon: KG_PER_TON, unit: "kg CO₂e" },
  { threshold: 0, perTon: GRAMS_PER_TON, unit: "g CO₂e" },
] as const;

/** Number at which a unit overflows into the next larger one. */
const INTENSITY_PROMOTION_LIMIT = 1000;

export interface EmissionIntensity {
  /** Localized number, already rounded to the unit's precision. */
  value: string;
  /** Mass unit only — the consumer appends `/${activityName}`. */
  unit: string;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export class Formatter {
  readonly locale: string;
  readonly decimalScale: number;
  readonly thousandSeparator: string;
  readonly decimalSeparator: string;
  readonly defaultEmptyValue: string;

  private readonly numberFmt: Intl.NumberFormat;
  private readonly adaptiveFmt: Intl.NumberFormat;
  private readonly labelFmt: Intl.NumberFormat;
  private readonly percentFmt: Intl.NumberFormat;
  private readonly exactFmt: Intl.NumberFormat;
  private readonly intensityFmt: Intl.NumberFormat;
  private readonly factorLabelFmt: Intl.NumberFormat;
  /** One formatter per allowed factor precision, keyed by fraction digits. */
  private readonly factorFmts: Map<number, Intl.NumberFormat>;
  private readonly dateFmt: Intl.DateTimeFormat;
  private readonly dateLongFmt: Intl.DateTimeFormat;
  private readonly dateNumericFmt: Intl.DateTimeFormat;
  private readonly dateDDMMYYYYFmt: Intl.DateTimeFormat;
  private readonly dateTimeFmt: Intl.DateTimeFormat;

  constructor(
    locale: string,
    decimalScale: number,
    defaultEmptyValue: string = DEFAULT_EMPTY_VALUE
  ) {
    this.locale = locale;
    this.decimalScale = decimalScale;
    this.defaultEmptyValue = defaultEmptyValue;

    const parts = new Intl.NumberFormat(locale, {
      useGrouping: true,
    }).formatToParts(1234.5);

    this.thousandSeparator =
      parts.find((p) => p.type === "group")?.value ?? ",";
    this.decimalSeparator =
      parts.find((p) => p.type === "decimal")?.value ?? ".";

    this.numberFmt = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: DEFAULT_MAX_FRACTION_DIGITS,
      useGrouping: true,
    });
    this.adaptiveFmt = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: MAX_DISPLAY_DECIMALS,
      useGrouping: true,
    });
    this.labelFmt = new Intl.NumberFormat(locale, {
      minimumFractionDigits: MAX_DISPLAY_DECIMALS,
      maximumFractionDigits: MAX_DISPLAY_DECIMALS,
      useGrouping: false,
    });
    this.percentFmt = new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    this.exactFmt = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: EXACT_MAX_FRACTION_DIGITS,
      useGrouping: true,
    });
    this.intensityFmt = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: INTENSITY_MAX_DECIMALS,
      useGrouping: true,
    });
    this.factorLabelFmt = new Intl.NumberFormat(locale, {
      minimumFractionDigits: FACTOR_DISPLAY_MAX_DECIMALS,
      maximumFractionDigits: FACTOR_DISPLAY_MAX_DECIMALS,
      useGrouping: false,
    });
    this.factorFmts = new Map(
      Array.from(
        {
          length: FACTOR_DISPLAY_MAX_DECIMALS - FACTOR_DISPLAY_MIN_DECIMALS + 1,
        },
        (_, index) => {
          const digits = FACTOR_DISPLAY_MIN_DECIMALS + index;
          return [
            digits,
            new Intl.NumberFormat(locale, {
              minimumFractionDigits: 0,
              maximumFractionDigits: digits,
              useGrouping: true,
            }),
          ] as const;
        }
      )
    );
    this.dateFmt = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    this.dateLongFmt = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    this.dateNumericFmt = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    // Locale-stable DD/MM/YYYY (en-GB always emits day/month/year with /).
    this.dateDDMMYYYYFmt = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    this.dateTimeFmt = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  date(
    dateStr: string | null | undefined,
    options?: { ifEmpty?: string }
  ): string {
    if (dateStr == null || dateStr === "") {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return this.dateFmt.format(date);
  }

  dateLong(
    dateStr: string | null | undefined,
    options?: { ifEmpty?: string }
  ): string {
    if (dateStr == null || dateStr === "") {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return this.dateLongFmt.format(date);
  }

  dateNumeric(
    dateStr: string | null | undefined,
    options?: { ifEmpty?: string }
  ): string {
    if (dateStr == null || dateStr === "") {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return this.dateNumericFmt.format(date);
  }

  /**
   * Returns the date in `DD/MM/YYYY` format regardless of the app locale.
   */
  dateDDMMYYYY(
    dateStr: string | null | undefined,
    options?: { ifEmpty?: string }
  ): string {
    if (dateStr == null || dateStr === "") {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return this.dateDDMMYYYYFmt.format(date);
  }

  /**
   * Returns the date in `DD-MM-YYYY` format, suitable for use as a
   * filename suffix (no characters that collide with path separators).
   * Defaults to "now" if no date is provided.
   */
  dateForFileName(date: Date = new Date()): string {
    return this.dateDDMMYYYYFmt.format(date).replaceAll("/", "-");
  }

  dateTime(
    dateStr: string | null | undefined,
    options?: { ifEmpty?: string }
  ): string {
    if (dateStr == null || dateStr === "") {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return this.dateTimeFmt.format(date);
  }

  private formatNumeric(value: number): string {
    if (value === 0) return this.numberFmt.format(0);

    const minDisplayable = Math.pow(10, -MAX_DISPLAY_DECIMALS);
    const defaultLow = Math.pow(10, -DEFAULT_MAX_FRACTION_DIGITS);
    const abs = Math.abs(value);

    if (abs < minDisplayable) {
      const threshold = this.labelFmt.format(minDisplayable);
      return value > 0 ? `<${threshold}` : `>-${threshold}`;
    }

    if (abs < defaultLow) {
      return this.adaptiveFmt.format(value);
    }

    return this.numberFmt.format(value);
  }

  emissions(
    value: number | null | undefined,
    options?: { withSuffix?: boolean; ifEmpty?: string }
  ): string {
    if (value == null || Number.isNaN(value)) {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    const withSuffix = options?.withSuffix ?? true;
    return `${this.formatNumeric(value)}${withSuffix ? " tCO₂e" : ""}`;
  }

  quantity(
    value: number | null | undefined,
    options?: { ifEmpty?: string }
  ): string {
    if (value == null || Number.isNaN(value)) {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    return this.formatNumeric(value);
  }

  rate(
    value: number | null | undefined,
    options?: { ifEmpty?: string }
  ): string {
    if (value == null || Number.isNaN(value)) {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    return this.formatNumeric(value);
  }

  /**
   * Emission factors are stored with 10 decimals and typically live in the
   * `0,01–1` range, where the shared `formatNumeric` caps at 2 decimals and
   * turns `0,056944` into `0,06` — a number that contradicts the emissions the
   * app reports for the same line. This method targets
   * `FACTOR_DISPLAY_SIGNIFICANT_DIGITS` significant digits instead, bounded by
   * `FACTOR_DISPLAY_MIN_DECIMALS` (no-regression floor) and
   * `FACTOR_DISPLAY_MAX_DECIMALS` (keeps the threshold label meaningful).
   *
   * The guard order is normative: zero is short-circuited first because
   * `log10(0)` is `-Infinity`, and the threshold label is decided before
   * formatting because otherwise `0,0000005` would round up into a displayable
   * `0,000001` and `10⁻⁷` would collapse to `0`.
   *
   * The precision is computed arithmetically rather than with
   * `maximumSignificantDigits` + `roundingPriority`: that option pair needs
   * Intl NumberFormat v3, and where it is missing the browser silently drops
   * back to less precision — the very bug this fixes, but intermittent.
   */
  emissionFactor(
    value: number | null | undefined,
    options?: { ifEmpty?: string }
  ): string {
    if (value == null || Number.isNaN(value)) {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    if (value === 0) return this.numberFmt.format(0);

    const abs = Math.abs(value);
    const minDisplayable = Math.pow(10, -FACTOR_DISPLAY_MAX_DECIMALS);

    if (abs < minDisplayable) {
      const threshold = this.factorLabelFmt.format(minDisplayable);
      return value > 0 ? `<${threshold}` : `>-${threshold}`;
    }

    const fractionDigits = clamp(
      FACTOR_DISPLAY_SIGNIFICANT_DIGITS - 1 - Math.floor(Math.log10(abs)),
      FACTOR_DISPLAY_MIN_DECIMALS,
      FACTOR_DISPLAY_MAX_DECIMALS
    );

    return (this.factorFmts.get(fractionDigits) ?? this.numberFmt).format(
      value
    );
  }

  /**
   * The factor exactly as the API delivered it, with no display rounding —
   * the value behind the "value used in the calculation" affordance and the
   * calculation chain.
   *
   * The API converts the `Decimal(28,10)` column with `Decimal.toNumber()`, so
   * the guarantee is "no rounding on top of what the API sent", not exact
   * decimal fidelity with the database.
   */
  emissionFactorExact(
    value: number | null | undefined,
    options?: { ifEmpty?: string }
  ): string {
    if (value == null || Number.isNaN(value)) {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    return this.exactFmt.format(value);
  }

  /**
   * Emission intensity (tCO₂e per unit of main activity) rendered with the
   * mass unit that keeps the number in `[1, 1000)`: `0,0000569444` t/unit
   * reads as `56,94 g CO₂e` instead of `0,000057 tCO₂e`.
   *
   * The unit is picked on the raw rate and re-checked after rounding, because
   * `0,999999` t selects kilograms but rounds to `1000` — it must be promoted
   * back to `1 t` rather than shown as `1.000 kg`. Above `1000` t there is no
   * larger unit, so the range is a target and not a guarantee.
   *
   * Returns value and unit separately: the equivalence card renders the number
   * in a hero typography and the unit in its own element, and each consumer
   * appends the activity name differently.
   */
  emissionIntensity(rate: number): EmissionIntensity {
    const grams = INTENSITY_SCALE[INTENSITY_SCALE.length - 1];

    // A non-finite rate can only come from a contract violation (the API
    // schema is a non-negative number); degrade to zero instead of crashing.
    if (rate === 0 || !Number.isFinite(rate)) {
      return { value: this.intensityFmt.format(0), unit: grams.unit };
    }

    let index = INTENSITY_SCALE.findIndex(
      (step) => Math.abs(rate) >= step.threshold
    );

    // Rounding can push the number into the next unit (999,999 g → 1.000 g).
    while (
      index > 0 &&
      Math.abs(this.roundToIntensity(rate * INTENSITY_SCALE[index].perTon)) >=
        INTENSITY_PROMOTION_LIMIT
    ) {
      index -= 1;
    }

    const step = INTENSITY_SCALE[index];
    const scaled = rate * step.perTon;

    if (this.roundToIntensity(scaled) === 0) {
      const floorLabel = this.intensityFmt.format(INTENSITY_MIN_DISPLAY_G);
      return {
        value: rate > 0 ? `<${floorLabel}` : `>-${floorLabel}`,
        unit: grams.unit,
      };
    }

    return { value: this.intensityFmt.format(scaled), unit: step.unit };
  }

  private roundToIntensity(value: number): number {
    const factor = Math.pow(10, INTENSITY_MAX_DECIMALS);
    return Math.round(value * factor) / factor;
  }

  percentage(
    fraction: number | null | undefined,
    options?: { maximumFractionDigits?: number; ifEmpty?: string }
  ): string {
    if (fraction == null || Number.isNaN(fraction)) {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    const fmt =
      options?.maximumFractionDigits === undefined
        ? this.percentFmt
        : new Intl.NumberFormat(this.locale, {
            style: "percent",
            maximumFractionDigits: options.maximumFractionDigits,
          });
    return fmt.format(fraction);
  }
}

export const formatter = new Formatter(APP_LOCALE, INPUT_DECIMAL_SCALE);
