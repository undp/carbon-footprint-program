import { describe, expect, it } from "vitest";
import { theme } from "./theme";

/**
 * WCAG 2.1 relative luminance of an `#rrggbb` color.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
const relativeLuminance = (hex: string): number => {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

/** WCAG 2.1 contrast ratio between two `#rrggbb` colors, from 1 to 21. */
const contrastRatio = (foreground: string, background: string): number => {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [lighter, darker] = a > b ? [a, b] : [b, a];

  return (lighter + 0.05) / (darker + 0.05);
};

const { common, primary, secondary, text } = theme.palette;

/**
 * The palette is the Dominican institutional identity, and the screens pair its
 * colors in a handful of fixed ways: white copy over the navy surfaces, dark
 * copy over the yellow badge, pale green figures over the dark cards. Retuning
 * a token silently breaks one of those pairings, so each is pinned to the WCAG
 * AA floor it has to clear.
 */
describe("brand palette contrast", () => {
  /** 4.5:1 — AA for body text. */
  const BODY_TEXT_FLOOR = 4.5;
  /** 3:1 — AA for large text and for UI outlines. */
  const LARGE_TEXT_FLOOR = 3;

  it.each([
    ["white on primary.main", common.white, primary.main],
    ["white on primary.dark", common.white, primary.dark],
    ["white on secondary.main", common.white, secondary.main],
    ["white on deepNavy", common.white, common.deepNavy],
    ["white on deepNavyDark", common.white, common.deepNavyDark],
    ["white on oceanTeal", common.white, common.oceanTeal],
    ["softLeaf on deepNavyDark", common.softLeaf, common.deepNavyDark],
    ["leafGreen on deepNavyDark", common.leafGreen, common.deepNavyDark],
    ["deepNavyDark on sunflower", common.deepNavyDark, common.sunflower],
    ["text.primary on paper", text.primary, common.white],
    ["primary.main on paper", primary.main, common.white],
  ])("%s clears AA for body text", (_pairing, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(
      BODY_TEXT_FLOOR
    );
  });

  it("keeps the leaf green legible as a large figure on white", () => {
    expect(contrastRatio(secondary.light, common.white)).toBeLessThan(
      LARGE_TEXT_FLOOR
    );
    expect(contrastRatio(secondary.main, common.white)).toBeGreaterThanOrEqual(
      BODY_TEXT_FLOOR
    );
  });

  it("never lets the attention yellow carry white text", () => {
    // The yellow is a light surface: it exists to be read against, not to be
    // read on. Guarding it stops a future retune from turning the pilot badge
    // into an unreadable white-on-yellow chip.
    expect(contrastRatio(common.white, common.sunflower)).toBeLessThan(
      LARGE_TEXT_FLOOR
    );
  });
});
