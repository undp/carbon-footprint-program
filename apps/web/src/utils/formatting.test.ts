import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APP_LOCALE,
  DEFAULT_EMPTY_VALUE,
  INPUT_DECIMAL_SCALE,
} from "@/config/constants";
import { Formatter, formatter } from "./formatting";

// The app locale is es-ES: group separator "." and decimal separator ",".
// Intl emits a non-breaking space (U+00A0) before "%" and a subscript-2 in the
// emissions unit; mirror those exact code points here so assertions fail loudly
// on a locale/ICU drift instead of silently on an invisible-character mismatch.
const NBSP = " ";
const EMISSIONS_SUFFIX = " tCO₂e"; // leading space + tCO + U+2082 + e

// Date inputs are ISO strings WITHOUT a timezone offset, so `new Date(...)`
// parses them as local wall-clock time and the (locale-default, no timeZone)
// Intl formatter renders them back in the same local zone. That round-trip is
// timezone-stable: the asserted output is identical under any TZ (verified for
// UTC / America/Los_Angeles / Asia/Tokyo / America/Santiago). Never introduce a
// trailing "Z" or offset here — that would make the rendered day/hour TZ-flaky.
const MARCH_5 = "2024-03-05T12:00:00";
const SEPT_15 = "2024-09-15T00:30:00";
const JAN_1_2020 = "2020-01-01T09:05:00";

describe("Formatter — constructor & derived separators", () => {
  it("derives es-ES separators and stores its config", () => {
    const fmt = new Formatter("es-ES", 4);
    expect(fmt.locale).toBe("es-ES");
    expect(fmt.decimalScale).toBe(4);
    expect(fmt.thousandSeparator).toBe(".");
    expect(fmt.decimalSeparator).toBe(",");
    expect(fmt.defaultEmptyValue).toBe(DEFAULT_EMPTY_VALUE);
  });

  it("derives en-US separators for a different locale", () => {
    const fmt = new Formatter("en-US", 2);
    expect(fmt.locale).toBe("en-US");
    expect(fmt.decimalScale).toBe(2);
    expect(fmt.thousandSeparator).toBe(",");
    expect(fmt.decimalSeparator).toBe(".");
    // Locale wiring reaches the number path, not just the stored separators.
    expect(fmt.quantity(1234.5)).toBe("1,234.5");
  });

  it("honours a custom defaultEmptyValue for empty inputs", () => {
    const fmt = new Formatter("es-ES", 4, "N/A");
    expect(fmt.defaultEmptyValue).toBe("N/A");
    expect(fmt.quantity(null)).toBe("N/A");
    expect(fmt.date(null)).toBe("N/A");
  });

  it("exports a singleton wired to the app locale/scale/empty-value", () => {
    expect(formatter.locale).toBe(APP_LOCALE);
    expect(formatter.decimalScale).toBe(INPUT_DECIMAL_SCALE);
    expect(formatter.defaultEmptyValue).toBe(DEFAULT_EMPTY_VALUE);
  });
});

describe("Formatter — numeric formatting (via quantity)", () => {
  const fmt = new Formatter("es-ES", 4);

  it.each<[number, string]>([
    // Zero short-circuits to the plain grouped "0".
    [0, "0"],
    [1, "1"],
    [-1, "-1"],
    [100, "100"],
    [999, "999"],
    // Grouping kicks in at 4 digits and repeats every 3.
    [1000, "1.000"],
    [10000, "10.000"],
    [1000000, "1.000.000"],
    [1234.5, "1.234,5"],
    // >= 0.01 uses max 2 fraction digits (rounds).
    [1234.567, "1.234,57"],
    [1234567.891, "1.234.567,89"],
    [-1234567.891, "-1.234.567,89"],
    [123.455, "123,46"],
    [123.454, "123,45"],
    [0.5, "0,5"],
    [0.05, "0,05"],
    // Boundary: exactly 0.01 is NOT < defaultLow, so it stays on the 2-dp path.
    [0.01, "0,01"],
    // < 0.01 switches to adaptive precision (up to 6 fraction digits).
    [0.009, "0,009"],
    [0.0099, "0,0099"],
    [0.009999, "0,009999"],
    [0.001, "0,001"],
    [-0.005, "-0,005"],
    // Boundary: exactly 10^-6 is displayable at 6 dp (not the "<" label).
    [0.000001, "0,000001"],
    [0.0000011, "0,000001"],
    // Below 10^-6: collapses to a directional threshold label, not "0".
    [0.0000005, "<0,000001"],
    [-0.0000005, ">-0,000001"],
  ])("quantity(%p) -> %p", (input, expected) => {
    expect(fmt.quantity(input)).toBe(expected);
  });

  it.each<[number | null | undefined, string]>([
    [null, DEFAULT_EMPTY_VALUE],
    [undefined, DEFAULT_EMPTY_VALUE],
    [NaN, DEFAULT_EMPTY_VALUE],
  ])("quantity(%p) -> empty placeholder", (input, expected) => {
    expect(fmt.quantity(input)).toBe(expected);
  });

  it("quantity honours ifEmpty override", () => {
    expect(fmt.quantity(null, { ifEmpty: "sin dato" })).toBe("sin dato");
    expect(fmt.quantity(NaN, { ifEmpty: "sin dato" })).toBe("sin dato");
  });

  it("rate / emissionFactor delegate to the same numeric formatting", () => {
    expect(fmt.rate(1234.5)).toBe("1.234,5");
    expect(fmt.rate(0.0000005)).toBe("<0,000001");
    expect(fmt.rate(null)).toBe(DEFAULT_EMPTY_VALUE);
    expect(fmt.rate(NaN, { ifEmpty: "x" })).toBe("x");

    expect(fmt.emissionFactor(1000000)).toBe("1.000.000");
    expect(fmt.emissionFactor(0.001)).toBe("0,001");
    expect(fmt.emissionFactor(undefined)).toBe(DEFAULT_EMPTY_VALUE);
    expect(fmt.emissionFactor(null, { ifEmpty: "-" })).toBe("-");
  });
});

describe("Formatter — emissions", () => {
  const fmt = new Formatter("es-ES", 4);

  it.each<[number, string]>([
    [1000, `1.000${EMISSIONS_SUFFIX}`],
    [0, `0${EMISSIONS_SUFFIX}`],
    [-1234567.891, `-1.234.567,89${EMISSIONS_SUFFIX}`],
    [0.0000005, `<0,000001${EMISSIONS_SUFFIX}`],
    [-0.0000005, `>-0,000001${EMISSIONS_SUFFIX}`],
  ])("emissions(%p) appends the tCO₂e suffix by default", (input, expected) => {
    expect(fmt.emissions(input)).toBe(expected);
  });

  it("omits the suffix when withSuffix is false", () => {
    expect(fmt.emissions(1000, { withSuffix: false })).toBe("1.000");
    expect(fmt.emissions(0, { withSuffix: false })).toBe("0");
  });

  it("keeps the suffix when withSuffix is explicitly true", () => {
    expect(fmt.emissions(1000, { withSuffix: true })).toBe(
      `1.000${EMISSIONS_SUFFIX}`
    );
  });

  it.each<[number | null | undefined]>([[null], [undefined], [NaN]])(
    "emissions(%p) -> empty placeholder (no suffix)",
    (input) => {
      expect(fmt.emissions(input)).toBe(DEFAULT_EMPTY_VALUE);
    }
  );

  it("emissions honours ifEmpty override", () => {
    expect(fmt.emissions(null, { ifEmpty: "N/D" })).toBe("N/D");
  });
});

describe("Formatter — percentage", () => {
  const fmt = new Formatter("es-ES", 4);

  it.each<[number, string]>([
    [0, `0${NBSP}%`],
    [0.5, `50${NBSP}%`],
    [0.125, `12,5${NBSP}%`],
    // Default formatter caps at 1 fraction digit (rounds).
    [0.1234, `12,3${NBSP}%`],
    [1, `100${NBSP}%`],
    [-0.5, `-50${NBSP}%`],
    [0.001, `0,1${NBSP}%`],
  ])("percentage(%p) -> %p", (input, expected) => {
    expect(fmt.percentage(input)).toBe(expected);
  });

  it("respects a custom maximumFractionDigits", () => {
    expect(fmt.percentage(0.12345, { maximumFractionDigits: 2 })).toBe(
      `12,35${NBSP}%`
    );
    expect(fmt.percentage(0.126, { maximumFractionDigits: 0 })).toBe(
      `13${NBSP}%`
    );
  });

  it.each<[number | null | undefined]>([[null], [undefined], [NaN]])(
    "percentage(%p) -> empty placeholder",
    (input) => {
      expect(fmt.percentage(input)).toBe(DEFAULT_EMPTY_VALUE);
    }
  );

  it("percentage honours ifEmpty override", () => {
    expect(fmt.percentage(null, { ifEmpty: "s/d" })).toBe("s/d");
  });
});

describe("Formatter — date formatters", () => {
  const fmt = new Formatter("es-ES", 4);

  it.each<[string, string]>([
    [MARCH_5, "5 mar 2024"],
    [SEPT_15, "15 sept 2024"],
  ])("date(%p) -> %p", (input, expected) => {
    expect(fmt.date(input)).toBe(expected);
  });

  it.each<[string, string]>([
    [MARCH_5, "5 de marzo de 2024"],
    [SEPT_15, "15 de septiembre de 2024"],
  ])("dateLong(%p) -> %p", (input, expected) => {
    expect(fmt.dateLong(input)).toBe(expected);
  });

  it.each<[string, string]>([
    [MARCH_5, "05/03/2024"],
    [JAN_1_2020, "01/01/2020"],
  ])("dateNumeric(%p) -> %p", (input, expected) => {
    expect(fmt.dateNumeric(input)).toBe(expected);
  });

  it.each<[string, string]>([
    [MARCH_5, "05/03/2024"],
    [JAN_1_2020, "01/01/2020"],
  ])("dateDDMMYYYY(%p) -> %p (locale-independent en-GB)", (input, expected) => {
    expect(fmt.dateDDMMYYYY(input)).toBe(expected);
  });

  it.each<[string, string]>([
    ["2024-03-05T14:30:00", "05/03/2024, 14:30"],
    ["1999-12-31T23:59:00", "31/12/1999, 23:59"],
  ])("dateTime(%p) -> %p (24h)", (input, expected) => {
    expect(fmt.dateTime(input)).toBe(expected);
  });

  // Every date formatter shares the same empty / invalid guard clauses.
  const dateMethods = [
    "date",
    "dateLong",
    "dateNumeric",
    "dateDDMMYYYY",
    "dateTime",
  ] as const;

  it.each(dateMethods)("%s returns the placeholder for empty input", (name) => {
    const method = fmt[name].bind(fmt);
    expect(method(null)).toBe(DEFAULT_EMPTY_VALUE);
    expect(method(undefined)).toBe(DEFAULT_EMPTY_VALUE);
    expect(method("")).toBe(DEFAULT_EMPTY_VALUE);
  });

  it.each(dateMethods)("%s honours ifEmpty for empty input", (name) => {
    const method = fmt[name].bind(fmt);
    expect(method(null, { ifEmpty: "sin fecha" })).toBe("sin fecha");
  });

  it.each(dateMethods)("%s passes an unparseable string through", (name) => {
    const method = fmt[name].bind(fmt);
    expect(method("no-es-fecha")).toBe("no-es-fecha");
    expect(method("2024-13-45")).toBe("2024-13-45");
  });
});

describe("Formatter — dateForFileName", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const fmt = new Formatter("es-ES", 4);

  it("formats an explicit Date as DD-MM-YYYY", () => {
    expect(fmt.dateForFileName(new Date(MARCH_5))).toBe("05-03-2024");
    // Local-component constructor: also timezone-stable.
    expect(fmt.dateForFileName(new Date(2024, 2, 5))).toBe("05-03-2024");
  });

  it("defaults to the current date when no argument is given", () => {
    // Pin "now" to a fixed local wall-clock so the default-argument branch is
    // deterministic across timezones.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(MARCH_5));
    expect(fmt.dateForFileName()).toBe("05-03-2024");
  });
});
