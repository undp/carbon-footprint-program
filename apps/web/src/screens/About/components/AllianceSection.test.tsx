import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "@/theme/theme";
import { ALLIANCE_ACTORS } from "../constants";
import { AllianceSection } from "./AllianceSection";

/**
 * One render, all assertions — deliberately.
 *
 * React warns about a missing list key only the FIRST time it renders a given
 * component, so splitting this into several `it`s would let the earlier render
 * swallow the warning and leave the key assertion passing no matter what. The
 * spy therefore has to be in place before the only render in the file.
 *
 * AllianceBanner paints itself with brandGradient, which reads the custom
 * `common.deepForest` palette key, so this needs the real theme rather than
 * MUI's default fallback.
 */
describe("AllianceSection", () => {
  it("renders every actor, names only those that have one, and keys them all", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <ThemeProvider theme={theme}>
        <AllianceSection />
      </ThemeProvider>
    );

    const keyWarnings = consoleError.mock.calls
      .map((call) => String(call[0]))
      .filter((message) => message.includes('unique "key"'));
    consoleError.mockRestore();

    // The Sweden actor deliberately carries no `name` — its logo already reads
    // "Suecia" — so keying the list by `actor.name` yields `key={undefined}`
    // for that card. Neither tsc nor `react/jsx-key` catches it: the prop is
    // present and `undefined` is a valid Key, so React's runtime warning is
    // the only signal.
    expect(keyWarnings).toEqual([]);

    ALLIANCE_ACTORS.forEach((actor) => {
      expect(screen.getByText(actor.role)).toBeInTheDocument();
    });

    const namedActors = ALLIANCE_ACTORS.filter((actor) => actor.name);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(
      namedActors.length
    );
  });
});
