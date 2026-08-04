import { describe, expect, it } from "vitest";
import { mergeSelectedOption } from "./mergeSelectedOption";

type Option = { id: string | number; name: string };

describe("mergeSelectedOption", () => {
  it("returns the original options untouched when selected is null", () => {
    const options: Option[] = [
      { id: "1", name: "Zebra" },
      { id: "2", name: "apple" },
    ];

    const result = mergeSelectedOption(options, null);

    // No merge and no sort when there is nothing to merge.
    expect(result).toBe(options);
    expect(result).toEqual([
      { id: "1", name: "Zebra" },
      { id: "2", name: "apple" },
    ]);
  });

  it("returns the original options untouched when selected is undefined", () => {
    const options: Option[] = [{ id: 1, name: "Solo" }];

    expect(mergeSelectedOption(options, undefined)).toBe(options);
  });

  it("appends a missing selected option and sorts alphabetically", () => {
    const options: Option[] = [
      { id: "1", name: "Zebra" },
      { id: "2", name: "apple" },
    ];

    const result = mergeSelectedOption(options, { id: "3", name: "mango" });

    // Case-insensitive locale sort: apple < mango < Zebra.
    expect(result).toEqual([
      { id: "2", name: "apple" },
      { id: "3", name: "mango" },
      { id: "1", name: "Zebra" },
    ]);
  });

  it("adds the selected option to an empty list", () => {
    const result = mergeSelectedOption<Option>([], { id: "9", name: "Único" });

    expect(result).toEqual([{ id: "9", name: "Único" }]);
  });

  it("dedupes by id, keeping the option from the upstream list", () => {
    const options: Option[] = [{ id: "1", name: "Original" }];

    const result = mergeSelectedOption(options, { id: "1", name: "Cambiado" });

    // unionBy keeps the first occurrence (from options), so the stale
    // selected name does not overwrite the upstream one.
    expect(result).toEqual([{ id: "1", name: "Original" }]);
  });

  it("sorts case- and accent-insensitively using the es locale", () => {
    const options: Option[] = [
      { id: "1", name: "Zorro" },
      { id: "2", name: "manzana" },
    ];

    const result = mergeSelectedOption(options, { id: "3", name: "Árbol" });

    // Á sorts as A (sensitivity: "base"): Árbol < manzana < Zorro.
    expect(result.map((option) => option.name)).toEqual([
      "Árbol",
      "manzana",
      "Zorro",
    ]);
  });

  it("supports numeric ids", () => {
    const options: Option[] = [
      { id: 10, name: "Beta" },
      { id: 20, name: "Alpha" },
    ];

    const result = mergeSelectedOption(options, { id: 30, name: "Gamma" });

    expect(result.map((option) => option.id)).toEqual([20, 10, 30]);
  });
});
