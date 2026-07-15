import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHATBOT_STREAM_IDLE_TIMEOUT_MS,
  CHATBOT_STREAM_OVERALL_TIMEOUT_MS,
} from "@/config/constants";
import type { ChatbotMessage, ChatbotState, SendMessageResult } from "./types";

const SEND_URL = "/api/chatbot/message";
const DELETE_URL = "/api/chatbot/conversations/me";

const GENERIC_ERROR_MESSAGE =
  "Ocurrió un error al contactar al asistente. Por favor intenta nuevamente.";
const TOO_LARGE_MESSAGE = "Tu mensaje es demasiado largo. Por favor acórtalo.";
const DEGRADED_MESSAGE =
  "El asistente no está disponible en este momento. Por favor intenta nuevamente en unos minutos.";

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
  const consecutiveFailuresRef = useRef(0);
  const lastEventIdRef = useRef<string | undefined>(undefined);
  // Tracks the id of the in-flight assistant message so updateLastAssistant can
  // target that exact bubble. Set synchronously in sendMessage (before React
  // flushes the append) and matched against `prev` inside updateLastAssistant's
  // own updater, so delta writes stay correct regardless of when the append
  // commits. Reset to null between turns and after deleteHistory.
  const inFlightAssistantIdRef = useRef<string | null>(null);
  // Monotonic counter used to mint locally unique React keys for each
  // message bubble. `Date.now()` collisions (mocked timers, two turns
  // started in the same millisecond) would otherwise let React reconcile
  // a freshly-mounted bubble onto the wrong DOM node.
  const messageIdCounterRef = useRef<number>(0);
  const nextMessageId = useCallback((role: "user" | "assistant"): string => {
    messageIdCounterRef.current += 1;
    return `${role}-${messageIdCounterRef.current}`;
  }, []);
  // AbortController for the in-flight turn, so the fetch + read loop can be
  // cancelled by the user (Stop), a client timeout, or unmount.
  const abortRef = useRef<AbortController | null>(null);
  // Guards against setState after unmount once the aborted fetch/read settles.
  const mountedRef = useRef(true);

  // Abort any in-flight turn on unmount so a stalled request cannot outlive
  // the widget and fire state updates after it is gone. Re-set `mountedRef`
  // in the body so StrictMode's mount/unmount/remount cycle leaves it true.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const updateLastAssistant = useCallback(
    (mutator: (msg: ChatbotMessage) => ChatbotMessage) => {
      const id = inFlightAssistantIdRef.current;
      if (id === null) return;
      setMessages((prev) => {
        // The in-flight assistant bubble is the last message during a turn;
        // the id guard confirms identity before mutating. Reading `prev` here
        // (not a pre-captured index) keeps this correct even if the append
        // that created the bubble committed after this call was queued.
        const idx = prev.length - 1;
        if (
          idx < 0 ||
          prev[idx]?.id !== id ||
          prev[idx]?.role !== "assistant"
        ) {
          return prev;
        }
        const next = [...prev];
        next[idx] = mutator(next[idx]);
        return next;
      });
    },
    []
  );

  const consumeStream = useCallback(
    async (
      response: Response,
      controller: AbortController
    ): Promise<SendMessageResult> => {
      if (!response.body) {
        return { kind: "error", message: GENERIC_ERROR_MESSAGE };
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let firstChunkSeen = false;
      // Abort the turn if no frame arrives within the idle window. Aborting
      // rejects the pending reader.read() below, which the catch turns into a
      // truncated/error result instead of hanging in "streaming" forever.
      let idleTimer: ReturnType<typeof setTimeout> | undefined;
      const resetIdleTimer = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(
          () => controller.abort(),
          CHATBOT_STREAM_IDLE_TIMEOUT_MS
        );
      };
      // Single classifier so the post-EOF buffer flush below dispatches
      // events the same way as the main loop. Returns a terminal result for
      // `done` / `error`, or `null` for content deltas (mutations are
      // applied as side effects).
      const processEvent = (ev: SsePayload): SendMessageResult | null => {
        if (ev.id) lastEventIdRef.current = ev.id;
        if (ev.event === "done") {
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
      resetIdleTimer();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          resetIdleTimer();
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
        if (idleTimer) clearTimeout(idleTimer);
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
      // Record the in-flight assistant id synchronously — targeting by identity
      // (not by an index captured inside the deferred append updater) keeps
      // delta writes correct no matter when React flushes this append.
      inFlightAssistantIdRef.current = assistantMessage.id;
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setState("loading");

      // Per-turn AbortController: cancellable by the user (Stop), the overall
      // timeout below, the idle timeout inside consumeStream, or unmount. The
      // signal is threaded into the fetch so aborting also tears down the
      // request and its stream.
      const controller = new AbortController();
      abortRef.current = controller;
      const overallTimer = setTimeout(
        () => controller.abort(),
        CHATBOT_STREAM_OVERALL_TIMEOUT_MS
      );

      const attempt = async (): Promise<{
        response: Response | null;
        transportError: boolean;
      }> => {
        const headers: Record<string, string> = {
          "content-type": "application/json",
        };
        if (lastEventIdRef.current) {
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

      try {
        // POST /message is NOT idempotent: it appends a turn and triggers an
        // LLM run. A fetch rejection does not prove the request never reached
        // the server, so we must not auto-retry — retrying after the first
        // request landed would double-submit the turn (duplicate turns,
        // doubled LLM cost, faster turn-cap exhaustion). Surface the failure
        // instead; the consecutive-failure counter still escalates to
        // "degraded" on a second straight failure.
        const { response, transportError } = await attempt();
        if (!mountedRef.current) return;
        if (transportError) {
          // An abort (user Stop, unmount, or a timeout) before any response
          // is a deliberate cancel, not a network failure — reset to idle
          // without escalating the failure counter.
          if (controller.signal.aborted) {
            setState("empty");
            return;
          }
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current >= 2) {
            setState("degraded");
            updateLastAssistant((msg) => ({
              ...msg,
              content: DEGRADED_MESSAGE,
              error: true,
            }));
            return;
          }
          setState("error");
          updateLastAssistant((msg) => ({
            ...msg,
            content: GENERIC_ERROR_MESSAGE,
            error: true,
          }));
          return;
        }

        if (!response) {
          setState("error");
          updateLastAssistant((msg) => ({
            ...msg,
            content: GENERIC_ERROR_MESSAGE,
            error: true,
          }));
          return;
        }

        if (!response.ok) {
          // 5xx means the backend itself is failing, so treat it like a
          // transport failure: increment the unavailability counter and let it
          // escalate to "degraded" after two in a row. 4xx are per-turn client
          // errors (the backend answered fine), so they reset the counter.
          if (response.status >= 500) {
            consecutiveFailuresRef.current += 1;
            let serverMessage = GENERIC_ERROR_MESSAGE;
            if (response.status === 503) {
              try {
                const json = (await response.json()) as { message?: string };
                if (json.message) serverMessage = json.message;
              } catch {
                // fall through to generic
              }
            }
            if (consecutiveFailuresRef.current >= 2) {
              setState("degraded");
              updateLastAssistant((msg) => ({
                ...msg,
                content: DEGRADED_MESSAGE,
                error: true,
              }));
              return;
            }
            setState("error");
            updateLastAssistant((msg) => ({
              ...msg,
              content: serverMessage,
              error: true,
            }));
            return;
          }
          consecutiveFailuresRef.current = 0;
          if (response.status === 413) {
            setState("error");
            updateLastAssistant((msg) => ({
              ...msg,
              content: TOO_LARGE_MESSAGE,
              error: true,
            }));
            return;
          }
          setState("error");
          updateLastAssistant((msg) => ({
            ...msg,
            content: GENERIC_ERROR_MESSAGE,
            error: true,
          }));
          return;
        }

        consecutiveFailuresRef.current = 0;
        const result = await consumeStream(response, controller);
        if (!mountedRef.current) return;

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
              error: true,
            }));
            break;
          case "degraded":
            setState("degraded");
            break;
        }
      } finally {
        clearTimeout(overallTimer);
        // Only clear the shared refs if they still point at THIS turn — a newer
        // turn may already have replaced them. Clearing here (not just on the
        // success path) means every exit — completed, truncated, error,
        // transport failure, early return — leaves the in-flight pointer clean.
        if (abortRef.current === controller) abortRef.current = null;
        if (inFlightAssistantIdRef.current === assistantMessage.id) {
          inFlightAssistantIdRef.current = null;
        }
      }
    },
    [consumeStream, nextMessageId, updateLastAssistant]
  );

  const deleteHistory = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(DELETE_URL, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.status === 204) {
        setMessages([]);
        setState("empty");
        lastEventIdRef.current = undefined;
        consecutiveFailuresRef.current = 0;
        inFlightAssistantIdRef.current = null;
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }, []);

  // User-facing cancel for the in-flight turn. Aborting rejects the fetch /
  // reader.read(), which sendMessage resolves to a truncated (or empty) turn,
  // releasing the widget from "loading"/"streaming".
  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { state, messages, sendMessage, deleteHistory, stop };
};
