import { describe, expect, it } from "vitest";
import {
  buildSourceYearWarning,
  extractYearFromSource,
  looksLikeSourceContainsYear,
} from "./emissionFactorSourceGuidance";

describe("looksLikeSourceContainsYear", () => {
  it("detects a four-digit reporting year in the factor name", () => {
    expect(looksLikeSourceContainsYear("DEFRA 2025")).toBe(true);
    expect(looksLikeSourceContainsYear("EcoAct 2020")).toBe(true);
    expect(looksLikeSourceContainsYear("IPCC (2019)")).toBe(true);
  });

  it("does not flag a clean provider name", () => {
    expect(looksLikeSourceContainsYear("DEFRA")).toBe(false);
    expect(looksLikeSourceContainsYear("Kool, A.")).toBe(false);
    expect(looksLikeSourceContainsYear("GHG Protocol")).toBe(false);
  });

  it("does not flag numbers that cannot be a reporting year", () => {
    // Only 19xx/20xx look like vintages; a version or catalogue number does not.
    expect(looksLikeSourceContainsYear("Tabla 2.6")).toBe(false);
    expect(looksLikeSourceContainsYear("Método 1234")).toBe(false);
    expect(looksLikeSourceContainsYear("EPA AP-42")).toBe(false);
  });

  it("does not flag a longer digit run that merely contains a year", () => {
    expect(looksLikeSourceContainsYear("Ref 120250")).toBe(false);
  });
});

describe("extractYearFromSource", () => {
  it("returns the detected year", () => {
    expect(extractYearFromSource("DEFRA 2025")).toBe(2025);
  });

  it("returns null when there is nothing that looks like a year", () => {
    expect(extractYearFromSource("DEFRA")).toBeNull();
  });
});

describe("buildSourceYearWarning", () => {
  it("suggests the name without the year and names the column to use", () => {
    const warning = buildSourceYearWarning("DEFRA 2025");

    expect(warning).toContain("2025");
    expect(warning).toContain('"DEFRA"');
    expect(warning).toContain("columna Año");
  });

  it("says outright that saving is still allowed", () => {
    // The guidance is about data quality, not a domain prohibition: a provider
    // whose name really contains a number must still be savable.
    expect(buildSourceYearWarning("DEFRA 2025")).toContain(
      "Puedes guardar de todas formas."
    );
  });

  it("returns null for a clean provider name, so no warning is rendered", () => {
    expect(buildSourceYearWarning("DEFRA")).toBeNull();
    expect(buildSourceYearWarning("")).toBeNull();
  });
});
