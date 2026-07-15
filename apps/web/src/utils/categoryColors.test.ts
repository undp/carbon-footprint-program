import { describe, expect, it } from "vitest";
import { alpha, darken } from "@mui/material/styles";
import { CATEGORY_COLORS, getColorPalette } from "./categoryColors";

// Mirror the private constants the source derives its set from, so assertions
// pin the exact wiring (which coefficient / which fallback) rather than the
// underlying MUI colour math (which is MUI's to test, not ours).
const FALLBACK = "#90A4AE";
const CONTRAST_TEXT = "#414046";
const DARK_COEFFICIENT = 0.6;
const LIGHT_ALPHA = 0.3;
const BACKGROUND_ALPHA = 0.8;

// The full set is a pure function of a single "main" colour; rebuild it here
// from the same MUI primitives to assert getColorPalette wires them correctly.
const expectedSetFor = (main: string) => ({
  main,
  dark: darken(main, DARK_COEFFICIENT),
  light: alpha(main, LIGHT_ALPHA),
  background: alpha(main, BACKGROUND_ALPHA),
  contrastText: CONTRAST_TEXT,
});

describe("getColorPalette — valid 6-digit hex", () => {
  it("derives the full set from the given colour", () => {
    expect(getColorPalette("#FFB74D")).toEqual(expectedSetFor("#FFB74D"));
  });

  it("accepts lowercase hex verbatim", () => {
    expect(getColorPalette("#ffb74d")).toEqual(expectedSetFor("#ffb74d"));
  });

  it("accepts mixed-case hex verbatim", () => {
    expect(getColorPalette("#AbCdEf")).toEqual(expectedSetFor("#AbCdEf"));
  });
});

describe("getColorPalette — 8-digit hex (alpha channel)", () => {
  it("strips the trailing alpha pair before deriving the set", () => {
    // #RRGGBBAA (length 9) → main is the #RRGGBB prefix, alpha discarded.
    expect(getColorPalette("#FFB74DCC")).toEqual(expectedSetFor("#FFB74D"));
  });

  it("uses only the RGB prefix even when the alpha pair reads as hex", () => {
    expect(getColorPalette("#123456FF")).toEqual(expectedSetFor("#123456"));
  });
});

describe("getColorPalette — invalid input falls back", () => {
  it.each([
    ["a named colour", "red"],
    ["missing hash", "FFB74D"],
    ["3-digit shorthand", "#FFF"],
    ["5 hex digits", "#12345"],
    ["7 hex digits", "#1234567"],
    ["non-hex characters", "#GGGGGG"],
    ["empty string", ""],
    ["9 chars but not valid hex after slice", "#ZZZZZZZZ"],
  ])("uses the blue-grey fallback for %s", (_label, input) => {
    expect(getColorPalette(input)).toEqual(expectedSetFor(FALLBACK));
  });

  it("keeps contrastText fixed regardless of the (fallback) main colour", () => {
    expect(getColorPalette("not-a-color").contrastText).toBe(CONTRAST_TEXT);
  });
});

describe("CATEGORY_COLORS palette", () => {
  it("exposes the 12 predefined category colours in order", () => {
    expect(CATEGORY_COLORS).toEqual([
      "#FFB74D",
      "#64B5F6",
      "#82C784",
      "#F06292",
      "#BA68C8",
      "#FFD54F",
      "#4DB6AC",
      "#FF8A65",
      "#7986CB",
      "#90A4AE",
      "#AED581",
      "#D4E157",
    ]);
  });

  it("contains only valid 6-digit hex strings", () => {
    for (const color of CATEGORY_COLORS) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("has no duplicate colours", () => {
    expect(new Set(CATEGORY_COLORS).size).toBe(CATEGORY_COLORS.length);
  });

  it("produces a set whose main is the palette colour for every entry", () => {
    for (const color of CATEGORY_COLORS) {
      expect(getColorPalette(color)).toEqual(expectedSetFor(color));
    }
  });
});
