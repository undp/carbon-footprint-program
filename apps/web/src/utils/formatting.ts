import {
  APP_LOCALE,
  DEFAULT_EMPTY_VALUE,
  INPUT_DECIMAL_SCALE,
  MAX_DISPLAY_DECIMALS,
} from "@/config/constants";

const DEFAULT_MAX_FRACTION_DIGITS = 2;

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
  private readonly dateFmt: Intl.DateTimeFormat;
  private readonly dateNumericFmt: Intl.DateTimeFormat;
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
    this.dateFmt = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    this.dateNumericFmt = new Intl.DateTimeFormat(locale, {
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

  emissionFactor(
    value: number | null | undefined,
    options?: { ifEmpty?: string }
  ): string {
    if (value == null || Number.isNaN(value)) {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    return this.formatNumeric(value);
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
