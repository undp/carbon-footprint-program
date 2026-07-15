import { describe, expect, it } from "vitest";
import { sortOrderByKey, toValueOptions } from "./dataGrid";

describe("toValueOptions", () => {
  it("maps each config entry to a { value, label } pair preserving order", () => {
    const config = {
      FOO: { label: "Foo" },
      BAR: { label: "Bar" },
    };

    expect(toValueOptions(config)).toEqual([
      { value: "FOO", label: "Foo" },
      { value: "BAR", label: "Bar" },
    ]);
  });

  it("keeps only value and label when entries carry extra fields", () => {
    const config = {
      A: { label: "Etiqueta A", sortOrder: 1, icon: "x" },
    };

    expect(toValueOptions(config)).toEqual([
      { value: "A", label: "Etiqueta A" },
    ]);
  });

  it("returns an empty array for an empty config", () => {
    expect(toValueOptions({})).toEqual([]);
  });
});

describe("sortOrderByKey", () => {
  it("collapses a config into a key → sortOrder map", () => {
    const config = {
      A: { sortOrder: 0 },
      B: { sortOrder: 5 },
      C: { sortOrder: 2 },
    };

    expect(sortOrderByKey(config)).toEqual({ A: 0, B: 5, C: 2 });
  });

  it("ignores extra fields on each entry", () => {
    const config = {
      X: { sortOrder: 3, label: "X" },
    };

    expect(sortOrderByKey(config)).toEqual({ X: 3 });
  });

  it("returns an empty object for an empty config", () => {
    expect(sortOrderByKey({})).toEqual({});
  });
});
