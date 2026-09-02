import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { SourceCitationWire } from "@repo/types";
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

  // Tasks 10.22 / 10.23 — the RAG citations panel.
  describe("citations panel", () => {
    const sources: SourceCitationWire[] = [
      {
        source_id: "1",
        chunk_id: "10",
        cite_label: "GHG Protocol — cap. 4",
        cite_url: "https://ghgprotocol.org/corporate-standard#c4",
        snippet: "Las emisiones de alcance 1 son emisiones directas…",
      },
      {
        source_id: "2",
        chunk_id: "20",
        cite_label: "ISO 14064-1",
        cite_url: "https://iso.org/standard/66453.html",
        snippet: "Especificación con orientación para la cuantificación…",
      },
    ];

    it("renders the panel with the source count when sourcesCited is non-empty", () => {
      render(
        <MessageBubble
          message={message({
            role: "assistant",
            content: "respuesta con fuentes",
            sourcesCited: sources,
          })}
        />
      );

      expect(screen.getByText("Fuentes consultadas (2)")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Ver fuentes consultadas" })
      ).toBeInTheDocument();
    });

    it("renders each source as a safely-targeted external link once expanded", () => {
      render(
        <MessageBubble
          message={message({
            role: "assistant",
            content: "respuesta con fuentes",
            sourcesCited: sources,
          })}
        />
      );

      // The panel starts collapsed, and MUI's Collapse hides its contents from
      // the accessibility tree, so expand before querying the links.
      const toggle = screen.getByRole("button", {
        name: "Ver fuentes consultadas",
      });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");

      for (const source of sources) {
        const link = screen.getByRole("link", { name: source.cite_label });
        expect(link).toHaveAttribute("href", source.cite_url);
        // rel is required alongside target=_blank: without noopener the opened
        // page can reach back through window.opener.
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      }
    });

    // One corpus source usually contributes several retrieved chunks to a turn;
    // the panel lists sources, so repeats of the same cite_url collapse to one.
    it("deduplicates sources that share a cite_url", () => {
      render(
        <MessageBubble
          message={message({
            role: "assistant",
            content: "respuesta",
            sourcesCited: [
              sources[0],
              { ...sources[0], chunk_id: "11" },
              sources[1],
            ],
          })}
        />
      );

      expect(screen.getByText("Fuentes consultadas (2)")).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: "Ver fuentes consultadas" })
      );
      expect(screen.getAllByRole("link")).toHaveLength(2);
    });

    it.each([
      ["absent", undefined],
      ["an empty array", [] as SourceCitationWire[]],
    ])("omits the panel entirely when sourcesCited is %s", (_label, cited) => {
      render(
        <MessageBubble
          message={message({
            role: "assistant",
            content: "respuesta sin fuentes",
            sourcesCited: cited,
          })}
        />
      );

      expect(screen.queryByText(/Fuentes consultadas/)).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Ver fuentes consultadas" })
      ).toBeNull();
    });

    // Citations belong to the assistant's answer; a user turn never carries them
    // even if the field is populated.
    it("omits the panel on a user message", () => {
      render(
        <MessageBubble
          message={message({
            role: "user",
            content: "pregunta",
            sourcesCited: sources,
          })}
        />
      );

      expect(screen.queryByText(/Fuentes consultadas/)).toBeNull();
    });
  });
});
