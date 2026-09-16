import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "@/theme/theme";
import { ALLIANCE_ACTORS } from "../constants";
import { AllianceSection } from "./AllianceSection";

/**
 * The render assertions live in one `it` deliberately.
 *
 * React warns about a missing list key only the FIRST time it renders a given
 * component, so splitting them would let an earlier render swallow the warning
 * and leave the key assertion passing no matter what. The spy therefore has to
 * be in place before the only render in the file.
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

    // Copy the calls out BEFORE restoring: Vitest's `mockRestore` also resets
    // the mock's state, so asserting on `consoleError.mock.calls` afterwards
    // would compare against an empty list and pass no matter what was logged.
    const logged = consoleError.mock.calls.map((call) => String(call[0]));
    consoleError.mockRestore();

    // Assert nothing was logged rather than filtering for a phrase. React's two
    // key warnings share no wording — the missing one reads `Each child in a
    // list should have a unique "key" prop` and the duplicate one `Encountered
    // two children with the same key` — so any substring filter covers one
    // failure and silently passes the other. Matching nothing at all also
    // survives React rewording its messages in a patch release.
    expect(logged).toEqual([]);

    ALLIANCE_ACTORS.forEach((actor) => {
      expect(screen.getByText(actor.role)).toBeInTheDocument();
    });

    const namedActors = ALLIANCE_ACTORS.filter((actor) => !actor.nameInLogo);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(
      namedActors.length
    );
  });

  // Guards the invariant the card key rests on, without depending on React
  // noticing: `id` is the one field in ALLIANCE_ACTORS that is not display copy,
  // and a deployment adding an actor has to give it a fresh one.
  it("gives every actor a unique id", () => {
    const ids = ALLIANCE_ACTORS.map((actor) => actor.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
