import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChatbotIcon } from "./ChatbotIcon";

// MUI's useTheme() falls back to the default theme when no ThemeProvider is
// present, so these render without one — we assert behavior/labels, not colors.
describe("ChatbotIcon", () => {
  it("renders an accessible open-assistant button", () => {
    render(<ChatbotIcon onClick={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Abrir asistente" })
    ).toBeInTheDocument();
  });

  it("calls onClick when pressed", () => {
    const onClick = vi.fn();
    render(<ChatbotIcon onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir asistente" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
