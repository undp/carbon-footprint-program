import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "./MessageBubble";
import type { ChatbotMessage } from "./types";

// Mirror the one user-facing string the component owns (the rest is the
// message's own content), so a copy change trips this test deliberately.
const TRUNCATED_NOTICE = "Respuesta interrumpida.";
const SPINNER_LABEL = "Generando respuesta";

const message = (over: Partial<ChatbotMessage>): ChatbotMessage => ({
  id: "m1",
  role: "assistant",
  content: "",
  ...over,
});

// MUI useTheme() falls back to the default theme without a ThemeProvider, which
// is enough here — we assert rendered content/structure, not exact colors.
describe("MessageBubble", () => {
  it("renders an error turn with its notice and an error icon", () => {
    const { container } = render(
      <MessageBubble
        message={message({
          role: "assistant",
          error: true,
          content: "El asistente no está disponible.",
        })}
      />
    );

    expect(
      screen.getByText("El asistente no está disponible.")
    ).toBeInTheDocument();
    // ErrorOutlineIcon renders an <svg> (error path skips the markdown pipeline).
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders a user message as plain text (no markdown parsing)", () => {
    render(
      <MessageBubble
        message={message({ role: "user", content: "**no** bold here" })}
      />
    );

    // User content is rendered verbatim in a single text node — the literal
    // asterisks survive because it never goes through react-markdown.
    expect(screen.getByText("**no** bold here")).toBeInTheDocument();
    expect(document.querySelector("strong")).toBeNull();
  });

  it("renders assistant markdown (bold + list) through the markdown pipeline", () => {
    render(
      <MessageBubble
        message={message({
          role: "assistant",
          content: "Hola **mundo**\n\n- uno\n- dos",
        })}
      />
    );

    const strong = screen.getByText("mundo");
    expect(strong.tagName).toBe("STRONG");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows a spinner while an assistant turn is in flight (empty content)", () => {
    render(
      <MessageBubble message={message({ role: "assistant", content: "" })} />
    );

    expect(screen.getByLabelText(SPINNER_LABEL)).toBeInTheDocument();
  });

  it("appends the interrupted notice when the turn was truncated", () => {
    render(
      <MessageBubble
        message={message({
          role: "assistant",
          content: "respuesta parcial",
          truncated: true,
        })}
      />
    );

    expect(screen.getByText(TRUNCATED_NOTICE)).toBeInTheDocument();
  });

  it("omits the interrupted notice for a complete assistant turn", () => {
    render(
      <MessageBubble
        message={message({ role: "assistant", content: "respuesta completa" })}
      />
    );

    expect(screen.queryByText(TRUNCATED_NOTICE)).toBeNull();
  });

  it("renders inline math via rehype-katex without throwing", () => {
    const { container } = render(
      <MessageBubble
        message={message({ role: "assistant", content: "Energía: $E = mc^2$" })}
      />
    );

    // rehype-katex emits .katex markup; assert the pipeline produced it.
    expect(container.querySelector(".katex")).toBeInTheDocument();
  });
});
