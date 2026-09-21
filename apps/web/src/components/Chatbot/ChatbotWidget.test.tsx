import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChatbotWidget } from "./ChatbotWidget";
import type { ChatbotMessage, ChatbotState } from "./types";

// Byte-for-byte mirrors of the widget's standing notices. Duplicated here
// deliberately so a copy change has to be made in two places on purpose.
const DISCLAIMER =
  "Respuestas generadas por IA. Pueden contener errores; verifica contra las fuentes citadas.";
const PRIVACY_NOTICE = "No compartas datos personales.";
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
      //
      // The absence of any deletion control is deliberate, not an oversight:
      // chatbot-rag-mvp design decision 25 defers the delete-history affordance,
      // and chatbot-mvp-hardening re-examined and upheld it — the erasure gap it
      // would have closed is narrowed instead by the 7-day anonymous retention
      // window. Do not "fix" this by adding a button.
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

  // Both notices are unconditional, so they must survive every state the widget
  // can be in, not just the happy path.
  describe("standing foot-of-chat notices", () => {
    const states: ChatbotState[] = [
      "empty",
      "loading",
      "streaming",
      "error",
      "truncated",
      "degraded",
    ];

    it.each(states)("are both rendered in the %s state", (state) => {
      h.initialState = state;
      h.initialMessages =
        state === "empty" ? [] : [assistantMessage("contenido")];
      render(<ChatbotWidget />);

      expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
      expect(screen.getByText(PRIVACY_NOTICE)).toBeInTheDocument();
    });

    it.each([
      ["AI disclaimer", DISCLAIMER],
      ["privacy notice", PRIVACY_NOTICE],
    ])(
      "the %s is static text with no interactive affordance",
      (_label, text) => {
        render(<ChatbotWidget />);

        const notice = screen.getByText(text);
        expect(notice).not.toHaveAttribute("role", "button");
        expect(notice.closest("button")).toBeNull();
        // No dismiss control anywhere in the notices' own container.
        expect(notice.parentElement?.querySelector("button")).toBeNull();
      }
    );

    // Nothing deletes expired conversations yet: `expires_at` bounds how long
    // one stays reachable, not how long the row survives. Any duration in this
    // notice would therefore read as a deletion promise the system does not
    // keep, which is the error that errs against the reader. This guards
    // against one creeping back in — put it back only with the purge.
    it("claims no retention window at all", () => {
      render(<ChatbotWidget />);

      expect(screen.getByText(PRIVACY_NOTICE)).toBeInTheDocument();
      expect(screen.queryByText(/días/)).toBeNull();
      expect(screen.queryByText(/se guardan/)).toBeNull();
    });
  });
});
