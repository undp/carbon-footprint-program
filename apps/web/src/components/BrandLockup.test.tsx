import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BRAND } from "@/config/brand";
import { BrandLockup } from "./BrandLockup";

// MUI's useTheme() falls back to the default theme when no ThemeProvider is
// present, so these render without one — we assert the wordmark and the
// artwork it picks, not colors.
describe("BrandLockup", () => {
  const sizes = {
    markHeight: 44,
    nameFontSize: 17,
    territoryFontSize: 8.5,
  };

  it("spells the full name out over two lines", () => {
    render(<BrandLockup {...sizes} />);

    expect(screen.getByText(BRAND.wordmarkName)).toBeInTheDocument();
    expect(screen.getByText(BRAND.wordmarkTerritory)).toBeInTheDocument();
  });

  it("falls back to the clipped name when the territory is hidden", () => {
    render(<BrandLockup {...sizes} showTerritory={false} />);

    expect(screen.getByText(BRAND.shortName)).toBeInTheDocument();
    expect(screen.queryByText(BRAND.wordmarkTerritory)).not.toBeInTheDocument();
  });

  it("swaps in the white mark over a dark surface", () => {
    const { container, rerender } = render(<BrandLockup {...sizes} />);
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      BRAND.markSrc
    );

    rerender(<BrandLockup {...sizes} contrast />);
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      BRAND.markContrastSrc
    );
  });

  it("renders as the element the surface asks for", () => {
    const { container } = render(<BrandLockup {...sizes} component="h1" />);

    expect(container.querySelector("h1")).toBeInTheDocument();
  });
});
