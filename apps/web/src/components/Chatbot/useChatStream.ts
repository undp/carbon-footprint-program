import { useCallback, useEffect, useRef, useState } from "react";
import type { SourceCitationWire } from "@repo/types";
import type { ChatbotMessage, ChatbotState, SendMessageResult } from "./types";

const SEND_URL = "/api/chatbot/message";
const LOAD_URL = "/api/chatbot/conversations/me/current";

// Mirror of the server-side cookie name in
// apps/api/src/features/chatbot/helpers/conversationCookie.ts. The server
// sets this cookie with httpOnly=false intentionally (Decision 28) so the
// widget can drop it on "Nueva conversación" without a server round-trip.
const CONVERSATION_COOKIE_NAME = "chatbot_conversation_id";
const CONVERSATION_COOKIE_PATH = "/api/chatbot";

const clearConversationCookieClient = (): void => {
  if (typeof document === "undefined") return;
  document.cookie = `${CONVERSATION_COOKIE_NAME}=; path=${CONVERSATION_COOKIE_PATH}; max-age=0; SameSite=Lax`;
};

const GENERIC_ERROR_MESSAGE =
  "Ocurrió un error al contactar al asistente. Por favor intenta nuevamente.";
const TOO_LARGE_MESSAGE = "Tu mensaje es demasiado largo. Por favor acórtalo.";
const DEGRADED_MESSAGE =
  "El asistente no está disponible en este momento. Recarga la página o intenta más tarde.";

type LoadedMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  sourcesCited: SourceCitationWire[];
  createdAt: string;
};

type LoadedConversationResponse = {
  conversation: { id: string; createdAt: string; expiresAt: string };
  messages: LoadedMessage[];
};

type SsePayload = {
  id?: string;
  event?: string;
  data: string;
};

// Match either a `\n\n` (LF-only) or `\r\n\r\n` (CRLF) blank-line terminator
// — spec-compliant SSE allows both, and a server / proxy may emit either.
const SSE_FRAME_SEPARATOR = /\r?\n\r?\n/;

const parseEvents = (
  buffer: string
): { events: SsePayload[]; rest: string } => {
  const events: SsePayload[] = [];
  let rest = buffer;
  let match = SSE_FRAME_SEPARATOR.exec(rest);
  while (match) {
    const block = rest.slice(0, match.index);
    rest = rest.slice(match.index + match[0].length);
    const lines = block.split(/\r?\n/);
    let id: string | undefined;
    let event: string | undefined;
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith("id:")) id = line.slice(3).trim();
      else if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length > 0) {
      events.push({ id, event, data: dataLines.join("\n") });
    }
    match = SSE_FRAME_SEPARATOR.exec(rest);
  }
  return { events, rest };
};

export const useChatStream = () => {
  const [state, setState] = useState<ChatbotState>("empty");
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  // `historyLoading` is true from mount until the rehydrate fetch settles
  // (200 / 204 / 404 / network error). The widget reads it to suppress the
  // "¿En qué puedo ayudarte?" placeholder briefly so a populated thread does
  // not flash empty before the seed lands.
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const consecutiveFailuresRef = useRef(0);
  const lastEventIdRef = useRef<string | undefined>(undefined);
  // Tracks the index of the in-flight assistant message inside `messages` so
  // updateLastAssistant can target it directly instead of scanning backward
  // on every delta. Reset to -1 between turns and on new conversation.
  const inFlightAssistantIndexRef = useRef<number>(-1);
  // AbortController for the active turn's fetch+SSE pipeline. startNewConversation
  // aborts it so an in-flight stream cannot re-dirty the freshly-cleared UI
  // with a late `error`/`truncated`/`empty` setState. Cleared at turn boundaries.
  const turnControllerRef = useRef<AbortController | null>(null);
  // Monotonic generation token bumped on every startNewConversation /
  // sendMessage start. setState calls inside an async sendMessage are gated
  // on the captured generation matching the current ref so a turn that was
  // cancelled mid-flight cannot mutate state that belongs to a later turn.
  const turnGenerationRef = useRef(0);
  // Monotonic counter used to mint locally unique React keys for each
  // message bubble. `Date.now()` collisions (mocked timers, two turns
  // started in the same millisecond) would otherwise let React reconcile
  // a freshly-mounted bubble onto the wrong DOM node.
  const messageIdCounterRef = useRef<number>(0);
  const nextMessageId = useCallback((role: "user" | "assistant"): string => {
    messageIdCounterRef.current += 1;
    return `${role}-${messageIdCounterRef.current}`;
  }, []);

  // Mount-time rehydration (Decision 28). The server reads the signed
  // chatbot_conversation_id cookie, checks the TTL and identity match, and
  // returns the persisted thread when valid. 204 / 404 / network errors all
  // collapse to "start empty" — never fatal.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(LOAD_URL, {
          method: "GET",
          credentials: "include",
        });
        if (cancelled || response.status !== 200) return;
        const body = (await response.json()) as LoadedConversationResponse;
        if (cancelled) return;
        const hydrated: ChatbotMessage[] = body.messages.map((m) => {
          const role: "user" | "assistant" =
            m.role === "USER" ? "user" : "assistant";
          const base: ChatbotMessage = {
            id: nextMessageId(role),
            role,
            content: m.content,
          };
          if (role === "assistant" && m.sourcesCited.length > 0) {
            base.sourcesCited = m.sourcesCited;
          }
          return base;
        });
        if (hydrated.length > 0) {
          setMessages(hydrated);
        }
      } catch {
        // Mount-time rehydrate is best-effort — a transport failure means we
        // start visually empty, not error.
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nextMessageId]);

  const updateLastAssistant = useCallback(
    (mutator: (msg: ChatbotMessage) => ChatbotMessage) => {
      const idx = inFlightAssistantIndexRef.current;
      if (idx < 0) return;
      setMessages((prev) => {
        if (idx >= prev.length || prev[idx]?.role !== "assistant") return prev;
        const next = [...prev];
        next[idx] = mutator(next[idx]);
        return next;
      });
    },
    []
  );

  const consumeStream = useCallback(
    async (response: Response): Promise<SendMessageResult> => {
      if (!response.body) {
        return { kind: "error", message: GENERIC_ERROR_MESSAGE };
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let firstChunkSeen = false;
      // Single classifier so the post-EOF buffer flush below dispatches
      // events the same way as the main loop. Returns a terminal result for
      // `done` / `error`, or `null` for content deltas (mutations are
      // applied as side effects).
      const processEvent = (ev: SsePayload): SendMessageResult | null => {
        if (ev.id) lastEventIdRef.current = ev.id;
        if (ev.event === "done") {
          try {
            const parsed = JSON.parse(ev.data) as {
              sources?: SourceCitationWire[];
            };
            if (Array.isArray(parsed.sources) && parsed.sources.length > 0) {
              const sources = parsed.sources;
              updateLastAssistant((msg) => ({
                ...msg,
                sourcesCited: sources,
              }));
            }
          } catch {
            // Malformed `done` payload — log and continue. Foundation widgets
            // that ignore the new optional field stay backwards-compatible.
            // eslint-disable-next-line no-console
            console.warn("Malformed done event payload");
          }
          return { kind: "completed" };
        }
        if (ev.event === "error") {
          try {
            const parsed = JSON.parse(ev.data) as {
              code?: string;
              message?: string;
            };
            return {
              kind: "error",
              code: parsed.code,
              message: parsed.message ?? GENERIC_ERROR_MESSAGE,
            };
          } catch {
            return { kind: "error", message: GENERIC_ERROR_MESSAGE };
          }
        }
        try {
          const parsed = JSON.parse(ev.data) as { content?: string };
          if (typeof parsed.content === "string") {
            if (!firstChunkSeen) {
              firstChunkSeen = true;
              setState("streaming");
            }
            updateLastAssistant((msg) => ({
              ...msg,
              content: msg.content + parsed.content,
            }));
          }
        } catch {
          // skip malformed event
        }
        return null;
      };
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events, rest } = parseEvents(buffer);
          buffer = rest;
          for (const ev of events) {
            const terminal = processEvent(ev);
            if (terminal) return terminal;
          }
        }
      } catch {
        return firstChunkSeen
          ? { kind: "truncated" }
          : { kind: "error", message: GENERIC_ERROR_MESSAGE };
      } finally {
        reader.releaseLock();
      }
      // EOF flush: if the server closed the connection with one final frame
      // still in `buffer` (no trailing blank line), recover it before
      // classifying the turn. Append a synthetic blank line so parseEvents'
      // separator regex picks the residual frame up.
      if (buffer.trim().length > 0) {
        const { events: trailing } = parseEvents(`${buffer}\n\n`);
        for (const ev of trailing) {
          const terminal = processEvent(ev);
          if (terminal) return terminal;
        }
      }
      // Reaching here means the stream ended cleanly without ever observing
      // a terminal `done` event. That is NOT a successful turn — the server
      // contract guarantees `event: done` on success, so a clean EOF before
      // it implies the connection was cut by an intermediate proxy or the
      // server closed early. Treat this as a truncated turn so the UI
      // reflects the partial content honestly.
      return firstChunkSeen
        ? { kind: "truncated" }
        : { kind: "error", message: GENERIC_ERROR_MESSAGE };
    },
    [updateLastAssistant]
  );

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      if (!content.trim()) return;
      // Reset per-turn scoped state — Last-Event-ID must only carry IDs
      // observed during the CURRENT turn's stream, never a stale one from
      // an earlier turn that completed or errored.
      lastEventIdRef.current = undefined;
      // Mint a generation token for this turn; every subsequent state mutation
      // checks that the token still matches before applying. startNewConversation
      // bumps the token, so a turn that was cancelled mid-flight cannot
      // re-dirty state that belongs to a later turn.
      turnGenerationRef.current += 1;
      const turnGeneration = turnGenerationRef.current;
      const isCurrentTurn = (): boolean =>
        turnGenerationRef.current === turnGeneration;
      const controller = new AbortController();
      turnControllerRef.current = controller;

      const userMessage: ChatbotMessage = {
        id: nextMessageId("user"),
        role: "user",
        content,
      };
      const assistantMessage: ChatbotMessage = {
        id: nextMessageId("assistant"),
        role: "assistant",
        content: "",
      };
      setMessages((prev) => {
        const next = [...prev, userMessage, assistantMessage];
        // The assistant message is the last element of `next`. Capture its
        // index in the ref so subsequent delta dispatches can target it
        // directly without iterating.
        inFlightAssistantIndexRef.current = next.length - 1;
        return next;
      });
      setState("loading");

      const attempt = async (
        withLastEventId: boolean
      ): Promise<{ response: Response | null; transportError: boolean }> => {
        const headers: Record<string, string> = {
          "content-type": "application/json",
        };
        if (withLastEventId && lastEventIdRef.current) {
          // Forward-compatibility plumbing only: the foundation backend
          // does not consume Last-Event-ID (it always streams from the
          // beginning) — see chatbot-message-streaming spec. Wired now so
          // V1 can add a server-side replay buffer without a client
          // contract change.
          headers["Last-Event-ID"] = lastEventIdRef.current;
        }
        try {
          const response = await fetch(SEND_URL, {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify({ content }),
            signal: controller.signal,
          });
          return { response, transportError: false };
        } catch {
          return { response: null, transportError: true };
        }
      };

      const initialAttempt = await attempt(false);
      let response = initialAttempt.response;
      if (!isCurrentTurn()) return;
      if (initialAttempt.transportError) {
        const retry = await attempt(true);
        if (!isCurrentTurn()) return;
        if (retry.transportError) {
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current >= 2) {
            setState("degraded");
            updateLastAssistant((msg) => ({
              ...msg,
              content: DEGRADED_MESSAGE,
            }));
            return;
          }
          setState("error");
          updateLastAssistant((msg) => ({
            ...msg,
            content: GENERIC_ERROR_MESSAGE,
          }));
          return;
        }
        response = retry.response;
      }

      if (!response) {
        if (isCurrentTurn()) setState("error");
        return;
      }

      if (!response.ok) {
        consecutiveFailuresRef.current = 0;
        if (response.status === 413) {
          if (!isCurrentTurn()) return;
          setState("error");
          updateLastAssistant((msg) => ({
            ...msg,
            content: TOO_LARGE_MESSAGE,
          }));
          return;
        }
        if (response.status === 503) {
          let serverMessage = GENERIC_ERROR_MESSAGE;
          try {
            const json = (await response.json()) as { message?: string };
            if (json.message) serverMessage = json.message;
          } catch {
            // fall through to generic
          }
          if (!isCurrentTurn()) return;
          setState("error");
          updateLastAssistant((msg) => ({ ...msg, content: serverMessage }));
          return;
        }
        if (!isCurrentTurn()) return;
        setState("error");
        updateLastAssistant((msg) => ({
          ...msg,
          content: GENERIC_ERROR_MESSAGE,
        }));
        return;
      }

      consecutiveFailuresRef.current = 0;
      const result = await consumeStream(response);
      if (!isCurrentTurn()) return;

      switch (result.kind) {
        case "completed":
          setState("empty");
          break;
        case "truncated":
          setState("truncated");
          updateLastAssistant((msg) => ({ ...msg, truncated: true }));
          break;
        case "error":
          setState("error");
          updateLastAssistant((msg) => ({
            ...msg,
            content: result.message,
          }));
          break;
        case "degraded":
          setState("degraded");
          break;
      }
      // Turn finished — clear the in-flight pointer and the per-turn controller
      // so the next turn starts clean and stale indices can't leak across turns.
      inFlightAssistantIndexRef.current = -1;
      if (turnControllerRef.current === controller) {
        turnControllerRef.current = null;
      }
    },
    [consumeStream, nextMessageId, updateLastAssistant]
  );

  // Frontend-only conversation reset: clears the visible thread and per-turn
  // refs without notifying the server. Prior turns remain persisted in the
  // backend conversation store — this is intentional, the user is starting
  // a NEW client-side thread, not deleting history. The conversation cookie
  // is dropped client-side (httpOnly=false per Decision 28) so a subsequent
  // page reload does NOT re-fetch the prior thread.
  const startNewConversation = useCallback((): void => {
    // Bump the generation token BEFORE we abort so any pending
    // setState calls inside an in-flight sendMessage that resume after
    // the abort observe a stale generation and skip the mutation.
    turnGenerationRef.current += 1;
    if (turnControllerRef.current) {
      turnControllerRef.current.abort();
      turnControllerRef.current = null;
    }
    clearConversationCookieClient();
    setMessages([]);
    setState("empty");
    lastEventIdRef.current = undefined;
    consecutiveFailuresRef.current = 0;
    inFlightAssistantIndexRef.current = -1;
  }, []);

  return {
    state,
    messages,
    historyLoading,
    sendMessage,
    startNewConversation,
  };
};
