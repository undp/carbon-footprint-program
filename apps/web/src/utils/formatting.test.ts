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

  it("rate delegates to the same numeric formatting", () => {
    expect(fmt.rate(1234.5)).toBe("1.234,5");
    expect(fmt.rate(0.0000005)).toBe("<0,000001");
    expect(fmt.rate(null)).toBe(DEFAULT_EMPTY_VALUE);
    expect(fmt.rate(NaN, { ifEmpty: "x" })).toBe("x");
  });
});

describe("Formatter — emissionFactor", () => {
  const fmt = new Formatter("es-ES", 4);

  // es-ES → "1.234,5". Reads a rendered factor back as a number so the tests
  // below can multiply exactly what the user sees on screen.
  const parseDisplayed = (displayed: string): number =>
    Number(displayed.replaceAll(".", "").replace(",", "."));

  const decimalsShown = (displayed: string): number =>
    displayed.split(",")[1]?.length ?? 0;

  it("keeps the previous output for the values the old formatter got right", () => {
    expect(fmt.emissionFactor(1000000)).toBe("1.000.000");
    expect(fmt.emissionFactor(0.001)).toBe("0,001");
    expect(fmt.emissionFactor(undefined)).toBe(DEFAULT_EMPTY_VALUE);
    expect(fmt.emissionFactor(null, { ifEmpty: "-" })).toBe("-");
  });

  it.each<[number, string]>([
    // The reported bug: 4 significant digits instead of the old "0,06".
    [0.056944, "0,05694"],
    // No zero padding up to the significant-digit target.
    [2.68, "2,68"],
    // The 2-decimal floor keeps the tenth that 4 significant digits would drop.
    [1234.5, "1.234,5"],
    // The 6-decimal ceiling is enough for this one, no label needed.
    [0.000123, "0,000123"],
  ])("emissionFactor(%p) -> %p", (input, expected) => {
    expect(fmt.emissionFactor(input)).toBe(expected);
  });

  it("gives the 2-decimal floor precedence over the significant digits", () => {
    // Real seed value: 6 significant digits, because dropping to 4 (1.164)
    // would show less precision than the format this change replaces.
    expect(fmt.emissionFactor(1164.4894)).toBe("1.164,49");
    expect(fmt.emissionFactor(999.99)).toBe("999,99");
  });

  it("gives the 6-decimal ceiling precedence over the significant digits", () => {
    // A single significant digit; the rest lives in the exact-value affordance.
    expect(fmt.emissionFactor(0.00000149)).toBe("0,000001");
  });

  it.each<[number, string]>([
    // Zero is short-circuited before the threshold guard...
    [0, "0"],
    // ...and the threshold guard runs before formatting, so a value that would
    // round up to a displayable 0,000001 still reads as "below the threshold".
    [0.0000005, "<0,000001"],
    [0.0000001, "<0,000001"],
    [-0.0000001, ">-0,000001"],
    // Exactly 10⁻⁶ is displayable, so it is NOT labelled.
    [0.000001, "0,000001"],
  ])("emissionFactor(%p) -> %p (guard order)", (input, expected) => {
    expect(fmt.emissionFactor(input)).toBe(expected);
  });

  it.each<[number | null | undefined, string]>([
    [null, DEFAULT_EMPTY_VALUE],
    [undefined, DEFAULT_EMPTY_VALUE],
    [NaN, DEFAULT_EMPTY_VALUE],
  ])("emissionFactor(%p) -> empty placeholder", (input, expected) => {
    expect(fmt.emissionFactor(input)).toBe(expected);
  });

  it("emissionFactor honours ifEmpty override", () => {
    expect(fmt.emissionFactor(NaN, { ifEmpty: "sin factor" })).toBe(
      "sin factor"
    );
  });

  it.each<number>([
    0.056944, 2.68, 1234.5, 1164.4894, 0.000123, 0.00000149, 0.01, 0.009999,
    0.5, 1000000, 0.001, 999.99,
  ])("never shows fewer decimals than the previous format for %p", (input) => {
    // `quantity()` still runs the untouched shared formatter, so it is the
    // living reference of the pre-change output.
    expect(decimalsShown(fmt.emissionFactor(input))).toBeGreaterThanOrEqual(
      decimalsShown(fmt.quantity(input))
    );
  });

  it("lets the user reproduce the reported emissions with the displayed factor", () => {
    const quantity = 21600;
    const storedFactor = 0.056944;

    const displayedFactor = parseDisplayed(fmt.emissionFactor(storedFactor));
    const manualTons = (quantity * displayedFactor) / 1000;
    const reportedTons = (quantity * storedFactor) / 1000;

    expect(fmt.emissions(manualTons)).toBe(fmt.emissions(reportedTons));
    expect(fmt.emissions(reportedTons)).toBe(`1,23${EMISSIONS_SUFFIX}`);
  });

  it("documents that very large quantities no longer reconcile by hand", () => {
    // Known and accepted limit: display precision is per column, not per row,
    // so at this scale the rounded factor drifts. The audit path is the exact
    // value affordance plus the calculation chain, not a per-row precision.
    const quantity = 10000000;
    const storedFactor = 0.056944;

    const displayedFactor = parseDisplayed(fmt.emissionFactor(storedFactor));

    expect(fmt.emissions((quantity * displayedFactor) / 1000)).toBe(
      `569,4${EMISSIONS_SUFFIX}`
    );
    expect(fmt.emissions((quantity * storedFactor) / 1000)).toBe(
      `569,44${EMISSIONS_SUFFIX}`
    );
  });
});

describe("Formatter — emissionFactorExact", () => {
  const fmt = new Formatter("es-ES", 4);

  it.each<[number, string]>([
    [0.056944, "0,056944"],
    [0.0569441234, "0,0569441234"],
    [1164.4894, "1.164,4894"],
    [0.0000001, "0,0000001"],
    [0, "0"],
  ])("emissionFactorExact(%p) -> %p", (input, expected) => {
    expect(fmt.emissionFactorExact(input)).toBe(expected);
  });

  it("applies no display rounding of its own", () => {
    // The display formatter rounds; the exact one must not.
    expect(fmt.emissionFactor(0.0569441234)).toBe("0,05694");
    expect(fmt.emissionFactorExact(0.0569441234)).toBe("0,0569441234");
  });

  it.each<[number | null | undefined, string]>([
    [null, DEFAULT_EMPTY_VALUE],
    [undefined, DEFAULT_EMPTY_VALUE],
    [NaN, DEFAULT_EMPTY_VALUE],
  ])("emissionFactorExact(%p) -> empty placeholder", (input, expected) => {
    expect(fmt.emissionFactorExact(input)).toBe(expected);
  });

  it("emissionFactorExact honours ifEmpty override", () => {
    expect(fmt.emissionFactorExact(null, { ifEmpty: "s/d" })).toBe("s/d");
  });
});

describe("Formatter — emissionIntensity", () => {
  const fmt = new Formatter("es-ES", 4);

  it.each<[number, string, string]>([
    [1.23, "1,23", "t CO₂e"],
    [0.00425, "4,25", "kg CO₂e"],
    // The reported case: 1,2299904 tCO₂e over 21.600 litres.
    [0.0000569444, "56,94", "g CO₂e"],
    // Whole grams are not padded with zeros.
    [0.000057, "57", "g CO₂e"],
  ])("emissionIntensity(%p) -> %p %s", (input, value, unit) => {
    expect(fmt.emissionIntensity(input)).toEqual({ value, unit });
  });

  it.each<[number, string, string]>([
    // Threshold borders belong to the larger unit.
    [1, "1", "t CO₂e"],
    [0.001, "1", "kg CO₂e"],
    // Rounding must not push a number out of its unit.
    [0.000999999, "1", "kg CO₂e"],
    [0.999999, "1", "t CO₂e"],
    // Nothing larger than a tonne, so the target range is exceeded on purpose.
    [1200, "1.200", "t CO₂e"],
  ])("emissionIntensity(%p) -> %p %s (borders)", (input, value, unit) => {
    expect(fmt.emissionIntensity(input)).toEqual({ value, unit });
  });

  it("floors a positive rate too small to render in grams", () => {
    expect(fmt.emissionIntensity(0.000000000005)).toEqual({
      value: "<0,01",
      unit: "g CO₂e",
    });
  });

  it("renders a zero rate as zero grams, not as the floor label", () => {
    expect(fmt.emissionIntensity(0)).toEqual({ value: "0", unit: "g CO₂e" });
  });
});

describe("Formatter — the precision change stops at factors", () => {
  const fmt = new Formatter("es-ES", 4);

  // Emissions are the reporting unit and quantities are typed by the user, so
  // both keep the shared 2-decimal formatting even for values that the factor
  // formatter now renders with more precision.
  it.each<[number, string]>([
    [0.056944, "0,06"],
    [1164.4894, "1.164,49"],
    [1234.5, "1.234,5"],
  ])(
    "quantity(%p) still uses the shared formatting -> %p",
    (input, expected) => {
      expect(fmt.quantity(input)).toBe(expected);
    }
  );

  it("emissions still uses the shared formatting", () => {
    expect(fmt.emissions(0.056944)).toBe(`0,06${EMISSIONS_SUFFIX}`);
    expect(fmt.emissions(0.056944, { withSuffix: false })).toBe("0,06");
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
