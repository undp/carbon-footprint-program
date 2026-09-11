import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChatbotWidget } from "./ChatbotWidget";
import type { ChatbotMessage, ChatbotState } from "./types";

// Byte-for-byte mirror of the widget's disclaimer (Task 10.34). Duplicated here
// deliberately so a copy change has to be made in two places on purpose.
const DISCLAIMER =
  "Huella usa IA y puede equivocarse. Verifica las respuestas con las fuentes citadas.";
const NEW_CONVERSATION_LABEL = "Nueva conversación";

// Per-test inputs for the useChatStream stub, plus a spy for the reset call.
// `vi.hoisted` because vi.mock factories are hoisted above the imports. The
// holder is annotated rather than asserted so the fields stay writable with the
// widened types each test needs.
const h = vi.hoisted(() => {
  const holder: {
    initialState: ChatbotState;
    initialMessages: ChatbotMessage[];
    resetSpy: Mock;
    sendSpy: Mock;
  } = {
    initialState: "empty",
    initialMessages: [],
    resetSpy: vi.fn(),
    sendSpy: vi.fn(),
  };
  return holder;
});

// A stateful stub rather than a bare vi.fn(): `startNewConversation` really
// clears the list, so "the rendered message list empties" is asserted against
// the DOM instead of against a mock call. The hook's own state effects are
// covered in useChatStream.test.ts, against the real implementation.
vi.mock("./useChatStream", () => ({
  useChatStream: () => {
    const [messages, setMessages] = useState<ChatbotMessage[]>(
      h.initialMessages
    );
    const [state, setState] = useState<ChatbotState>(h.initialState);
    return {
      state,
      messages,
      sendMessage: h.sendSpy,
      stop: vi.fn(),
      deleteHistory: vi.fn(),
      seedMessages: vi.fn(),
      startNewConversation: () => {
        h.resetSpy();
        setMessages([]);
        setState("empty");
      },
    };
  },
}));

// Stub the mount-time rehydrate so it issues no request of its own — otherwise
// "the reset fires zero HTTP requests" could not be told apart from the fetch
// the widget makes on mount anyway.
vi.mock("./useConversationRehydrate", () => ({
  useConversationRehydrate: () => ({ historyLoading: false }),
}));

const assistantMessage = (content: string): ChatbotMessage => ({
  id: "a1",
  role: "assistant",
  content,
});

let fetchMock: Mock;

beforeEach(() => {
  h.initialState = "empty";
  h.initialMessages = [];
  h.resetSpy.mockClear();
  h.sendSpy.mockClear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  // The widget auto-opens on "/" only until it records that it has introduced
  // itself, and clicking a header control sets that flag — so clear it between
  // tests or every test after the first would render collapsed.
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// jsdom's location is "/", and nothing has been introduced yet, so the widget
// mounts open. MUI useTheme() falls back to the default theme with no provider.
describe("ChatbotWidget", () => {
  it("mounts open on the landing path", () => {
    render(<ChatbotWidget />);
    expect(screen.getByTestId("chatbot-widget")).toBeInTheDocument();
  });

  // Task 10.28
  describe("Nueva conversación", () => {
    it("exposes the control under its accessible name", () => {
      render(<ChatbotWidget />);

      const button = screen.getByRole("button", {
        name: NEW_CONVERSATION_LABEL,
      });
      expect(button).toBeInTheDocument();
      // Guards against regressing to the destructive wording of earlier drafts.
      expect(
        screen.queryByRole("button", { name: /Limpiar conversación/ })
      ).toBeNull();
      expect(screen.queryByRole("button", { name: /Eliminar/ })).toBeNull();
    });

    it("empties the rendered message list without any HTTP request", () => {
      h.initialMessages = [assistantMessage("respuesta previa")];
      render(<ChatbotWidget />);

      expect(screen.getByText("respuesta previa")).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("button", { name: NEW_CONVERSATION_LABEL })
      );

      expect(screen.queryByText("respuesta previa")).toBeNull();
      expect(h.resetSpy).toHaveBeenCalledTimes(1);
      // The reset is non-destructive: prior turns stay persisted server-side, so
      // no DELETE — and no request of any kind — leaves the client.
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("shows the empty-state prompt again after the reset", () => {
      h.initialMessages = [assistantMessage("respuesta previa")];
      render(<ChatbotWidget />);

      fireEvent.click(
        screen.getByRole("button", { name: NEW_CONVERSATION_LABEL })
      );

      expect(screen.getByText("¿En qué puedo ayudarte?")).toBeInTheDocument();
    });

    it("is disabled while a turn is in flight", () => {
      h.initialState = "streaming";
      render(<ChatbotWidget />);

      expect(
        screen.getByRole("button", { name: NEW_CONVERSATION_LABEL })
      ).toBeDisabled();
    });
  });

  // Task 10.34 — the disclaimer is unconditional, so it must survive every
  // state the widget can be in, not just the happy path.
  describe("foot-of-chat disclaimer", () => {
    const states: ChatbotState[] = [
      "empty",
      "loading",
      "streaming",
      "error",
      "truncated",
      "degraded",
    ];

    it.each(states)("is rendered in the %s state", (state) => {
      h.initialState = state;
      h.initialMessages =
        state === "empty" ? [] : [assistantMessage("contenido")];
      render(<ChatbotWidget />);

      expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
    });

    it("is static text with no interactive affordance", () => {
      render(<ChatbotWidget />);

      const disclaimer = screen.getByText(DISCLAIMER);
      expect(disclaimer).not.toHaveAttribute("role", "button");
      expect(disclaimer.closest("button")).toBeNull();
      // No dismiss control anywhere in the disclaimer's own container.
      expect(disclaimer.parentElement?.querySelector("button")).toBeNull();
    });
  });
});
