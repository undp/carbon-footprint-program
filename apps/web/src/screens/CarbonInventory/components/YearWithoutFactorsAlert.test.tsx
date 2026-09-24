import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { YearWithoutFactorsAlert } from "./YearWithoutFactorsAlert";

// MUI's useTheme() falls back to the default theme when no ThemeProvider is
// present, so this renders without one — the assertions are about the copy.
describe("YearWithoutFactorsAlert", () => {
  it("names the year that has no factors", () => {
    render(<YearWithoutFactorsAlert year={2022} />);

    expect(
      screen.getByText("Todavía no hay factores de emisión para el año 2022")
    ).toBeInTheDocument();
  });

  it("offers both ways forward: a factor of one's own or another year", () => {
    render(<YearWithoutFactorsAlert year={2022} />);
    const alert = screen.getByRole("alert");

    expect(alert).toHaveTextContent(
      "Las subcategorías llegarán sin factores precargados"
    );
    expect(alert).toHaveTextContent("elegir «Otro» como fuente");
    expect(alert).toHaveTextContent("o elegir otro año");
  });

  it("speaks of fuentes de emisión, never of líneas", () => {
    render(<YearWithoutFactorsAlert year={2022} />);
    const alert = screen.getByRole("alert");

    expect(alert).toHaveTextContent("fuentes de emisión");
    expect(alert.textContent).not.toMatch(/l[ií]nea/i);
  });
});
