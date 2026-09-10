import { describe, expect, it } from "vitest";
import {
  checkPositionsAreContiguous,
  type PositionedSubcategory,
} from "./seedSubcategories.js";

function row(
  categoryName: string,
  position: number,
  overrides?: Partial<PositionedSubcategory>
): PositionedSubcategory {
  return {
    countryIsoCode: "CL",
    methodologyVersionName: "Test Methodology",
    categoryName,
    position,
    ...overrides,
  };
}

describe("checkPositionsAreContiguous", () => {
  it("accepts positions running 1..N", () => {
    expect(() =>
      checkPositionsAreContiguous([
        row("Alcance 1", 1),
        row("Alcance 1", 2),
        row("Alcance 1", 3),
      ])
    ).not.toThrow();
  });

  it("accepts them in any input order", () => {
    expect(() =>
      checkPositionsAreContiguous([
        row("Alcance 1", 3),
        row("Alcance 1", 1),
        row("Alcance 1", 2),
      ])
    ).not.toThrow();
  });

  it("numbers each category independently", () => {
    expect(() =>
      checkPositionsAreContiguous([
        row("Alcance 1", 1),
        row("Alcance 1", 2),
        row("Alcance 3", 1),
      ])
    ).not.toThrow();
  });

  it("separates categories of the same name in different methodologies", () => {
    expect(() =>
      checkPositionsAreContiguous([
        row("Alcance 1", 1),
        row("Alcance 1", 1, { methodologyVersionName: "Other Methodology" }),
        row("Alcance 1", 1, { countryIsoCode: "DO" }),
      ])
    ).not.toThrow();
  });

  it("rejects a gap left by a subcategory removed without renumbering", () => {
    expect(() =>
      checkPositionsAreContiguous([
        row("Alcance 3", 1),
        row("Alcance 3", 2),
        row("Alcance 3", 4),
      ])
    ).toThrow(/Alcance 3 \(1, 2, 4\)/);
  });

  it("rejects a duplicated position", () => {
    // No separate duplicate check exists: 1..N with no gaps is what rules a
    // repeated position out, and the message has to show it.
    expect(() =>
      checkPositionsAreContiguous([
        row("Alcance 3", 1),
        row("Alcance 3", 2),
        row("Alcance 3", 2),
      ])
    ).toThrow(/Alcance 3 \(1, 2, 2\)/);
  });

  it("rejects numbering that does not start at 1", () => {
    expect(() =>
      checkPositionsAreContiguous([row("Alcance 2", 2), row("Alcance 2", 3)])
    ).toThrow(/Alcance 2 \(2, 3\)/);
  });

  it("names every offending category", () => {
    expect(() =>
      checkPositionsAreContiguous([
        row("Alcance 1", 1),
        row("Alcance 2", 5),
        row("Alcance 3", 2),
      ])
    ).toThrow(/Alcance 2 \(5\); CL > Test Methodology > Alcance 3 \(2\)/);
  });
});
