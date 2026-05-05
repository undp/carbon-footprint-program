import {
  APP_LOCALE,
  DEFAULT_EMPTY_VALUE,
  INPUT_DECIMAL_SCALE,
} from "@/config/constants";

export class Formatter {
  readonly locale: string;
  readonly decimalScale: number;
  readonly thousandSeparator: string;
  readonly decimalSeparator: string;
  readonly defaultEmptyValue: string;

  private readonly numberFmt: Intl.NumberFormat;
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
      maximumFractionDigits: 2,
      useGrouping: true,
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

  emissions(
    value: number | null | undefined,
    options?: { withSuffix?: boolean; ifEmpty?: string }
  ): string {
    if (value == null || Number.isNaN(value)) {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    const withSuffix = options?.withSuffix ?? true;
    return `${this.numberFmt.format(value)}${withSuffix ? " tCO₂e" : ""}`;
  }

  quantity(
    value: number | null | undefined,
    options?: { ifEmpty?: string }
  ): string {
    if (value == null || Number.isNaN(value)) {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    return this.numberFmt.format(value);
  }

  rate(
    value: number | null | undefined,
    options?: { ifEmpty?: string }
  ): string {
    if (value == null || Number.isNaN(value)) {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    return this.numberFmt.format(value);
  }

  emissionFactor(
    value: number | null | undefined,
    options?: { ifEmpty?: string }
  ): string {
    if (value == null || Number.isNaN(value)) {
      return options?.ifEmpty ?? this.defaultEmptyValue;
    }
    return this.numberFmt.format(value);
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
