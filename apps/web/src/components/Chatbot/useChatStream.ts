import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHATBOT_CONVERSATION_ID_HEADER,
  SourceCitationWireArraySchema,
} from "@repo/types";
import type { SourceCitationWire } from "@repo/types";
import {
  CHATBOT_STREAM_IDLE_TIMEOUT_MS,
  CHATBOT_STREAM_OVERALL_TIMEOUT_MS,
} from "@/config/constants";
import { API_BASE_URL } from "@/config/environment";
import { buildChatbotHeaders } from "./authHeaders";
import {
  clearConversationId,
  readConversationId,
  writeConversationId,
} from "./conversationStore";
import type { ChatbotMessage, ChatbotState, SendMessageResult } from "./types";

// Absolute, like every other call in the app (see api/http/client.ts, which
// builds `apiClient` with `prefix: API_BASE_URL`). These used to be relative
// `/api/...` paths, which silently assumed the deployment's edge served the API
// from the web app's own origin. Where it does not — a Static Web App front end
// with the API on its own App Service domain — the browser sent them to the
// static host instead: POST /api/chatbot/message answered 405, and the
// rehydrate GET answered 200 with the SPA's index.html, which does not even
// look like a failure. Routing is not a portable fix either: Azure's linked
// backend needs a Standard SKU, so a Free-tier deployment cannot express it.
//
// The cross-site pieces this relies on are already in place: every fetch below
// passes `credentials: "include"`, the server sets the chatbot cookies with
// SameSite=None in production, and the API's ALLOWED_ORIGIN names the front end.
const SEND_URL = `${API_BASE_URL}/chatbot/message`;
const DELETE_URL = `${API_BASE_URL}/chatbot/conversations/me`;

/** Shape `seedMessages` accepts — ids are minted here, not by the caller. */
export type SeedMessage = {
  role: "user" | "assistant";
  content: string;
  sourcesCited?: SourceCitationWire[];
};

const GENERIC_ERROR_MESSAGE =
  "Ocurrió un error al contactar al asistente. Por favor intenta nuevamente.";
const TOO_LARGE_MESSAGE = "Tu mensaje es demasiado largo. Por favor acórtalo.";
const RATE_LIMITED_MESSAGE =
  "Estás enviando consultas muy seguido. Por favor espera un momento y vuelve a intentar.";
const DEGRADED_MESSAGE =
  "El asistente no está disponible en este momento. Por favor intenta nuevamente en unos minutos.";

/**
 * Read the `message` an API error response carries, or null when it carries
 * none. The 503, 413 and quota-429 branches all need it: the server writes a
 * specific, user-facing Spanish string for each and the widget should show
 * that rather than a fixed one.
 */
const readServerMessage = async (
  response: Response
): Promise<string | null> => {
  try {
    const json = (await response.json()) as { message?: string };
    return json.message ?? null;
  } catch {
    return null;
  }
};

/**
 * Turn a 4xx into something the user can act on.
 *
 * The server already tells these apart; the widget used to collapse every one
 * of them but 413 into GENERIC_ERROR_MESSAGE. 413 itself has three distinct
 * causes server-side — oversized message, oversized history, turn cap — and
 * only the first is fixed by shortening the message, so a fixed "acórtalo"
 * was actively wrong advice for the other two.
 */
const describeClientError = async (response: Response): Promise<string> => {
  if (response.status === 429) {
    // Two different refusals share this status and must not share copy.
    //
    // The burst limiter answers in onRequest and sets `x-ratelimit-reset` with
    // the remaining window; its own body is English text from the plugin, so it
    // is deliberately NOT read. Naming the seconds turns "something broke" into
    // "wait this long", which is the whole difference there.
    //
    // The token budgets answer from the handler with Spanish copy specific to
    // the layer that refused — a personal daily limit, or a shared pool whose
    // remedy is signing in — and set no limiter headers. Showing the burst
    // message for those would tell someone to slow down when slowing down
    // changes nothing.
    const reset = Number(response.headers.get("x-ratelimit-reset"));
    if (Number.isFinite(reset) && reset > 0) {
      return `Estás enviando consultas muy seguido. Por favor vuelve a intentar en ${reset} segundos.`;
    }
    return (await readServerMessage(response)) ?? RATE_LIMITED_MESSAGE;
  }
  if (response.status === 413) {
    return (await readServerMessage(response)) ?? TOO_LARGE_MESSAGE;
  }
  // The Zod body schema rejects content over the character cap before the
  // handler runs, so an oversized message arrives here and not as a 413.
  if (response.status === 400) return TOO_LARGE_MESSAGE;
  return GENERIC_ERROR_MESSAGE;
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
          // The terminal `done` payload carries the corpus chunks the assistant
          // grounded this turn in (RAG). Optional: a non-tool turn omits it, and
          // a foundation-era backend never sends it.
          try {
            const parsed = JSON.parse(ev.data) as { sources?: unknown };
            if (parsed.sources !== undefined) {
              // Validated rather than cast: the field crosses the wire, and an
              // entry missing `cite_url` would reach MessageBubble as an
              // undefined React key and a blank row. A bad payload degrades to
              // "no citations" — the answer already streamed and is still good.
              const result = SourceCitationWireArraySchema.safeParse(
                parsed.sources
              );
              if (!result.success) {
                // eslint-disable-next-line no-console
                console.warn(
                  "Malformed `sources` field on chatbot `done` event; rendering the turn without citations."
                );
              } else if (result.data.length > 0) {
                const sources = result.data;
                updateLastAssistant((msg) => ({
                  ...msg,
                  sourcesCited: sources,
                }));
              }
            }
          } catch {
            // A malformed `done` payload must not fail an otherwise good turn —
            // the text already streamed. Drop the citations and complete.
            // eslint-disable-next-line no-console
            console.warn("Malformed chatbot `done` event payload");
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

      // True while THIS turn is still the active one. `startNewConversation`
      // nulls `abortRef` (and a newer send replaces it), so a turn it cancelled
      // mid-flight cannot write state that belongs to the cleared/next thread.
      // `stop()` deliberately leaves `abortRef` pointing here, so a user-stopped
      // turn still resolves to "truncated" with its partial content.
      const isCurrentTurn = (): boolean => abortRef.current === controller;

      const attempt = async (): Promise<{
        response: Response | null;
        transportError: boolean;
      }> => {
        const headers = await buildChatbotHeaders({
          "content-type": "application/json",
        });
        // Resolving the token is an await, so Stop (or a timeout, or unmount)
        // can land between here and the fetch below. Real `fetch` rejects
        // immediately on an already-aborted signal, which the caller reads as
        // a cancel; returning that outcome directly is the same answer without
        // opening a request nobody is waiting for.
        if (controller.signal.aborted) {
          return { response: null, transportError: true };
        }
        if (lastEventIdRef.current) {
          // Forward-compatibility plumbing only: the foundation backend
          // does not consume Last-Event-ID (it always streams from the
          // beginning) — see chatbot-message-streaming spec. Wired now so
          // V1 can add a server-side replay buffer without a client
          // contract change.
          headers["Last-Event-ID"] = lastEventIdRef.current;
        }
        // Read at send time rather than captured when the hook mounted: a
        // turn that opened a new thread has already written the id back, and
        // "Nueva conversación" may have cleared it since. Omitting the field
        // is what asks the server for a fresh conversation.
        const conversationId = readConversationId();
        const body: { content: string; conversationId?: string } = { content };
        if (conversationId !== null) body.conversationId = conversationId;
        try {
          const response = await fetch(SEND_URL, {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify(body),
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

        // Before branching on status: the server commits the conversation and
        // the user's message before it ever calls the model, so a turn that
        // ends in 503 still created a thread. Storing the id only on success
        // would abandon it and open a second one on the retry. Reads null when
        // the failure happened before a conversation existed, and when a proxy
        // strips the header or CORS does not expose it — in which case the next
        // turn starts fresh, which is the same behaviour as a first visit.
        const attachedId = response.headers.get(CHATBOT_CONVERSATION_ID_HEADER);
        if (attachedId) writeConversationId(attachedId);

        if (!response.ok) {
          // 5xx means the backend itself is failing, so treat it like a
          // transport failure: increment the unavailability counter and let it
          // escalate to "degraded" after two in a row. 4xx are per-turn client
          // errors (the backend answered fine), so they reset the counter.
          if (response.status >= 500) {
            consecutiveFailuresRef.current += 1;
            let serverMessage = GENERIC_ERROR_MESSAGE;
            if (response.status === 503) {
              serverMessage =
                (await readServerMessage(response)) ?? GENERIC_ERROR_MESSAGE;
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
          const clientErrorMessage = await describeClientError(response);
          setState("error");
          updateLastAssistant((msg) => ({
            ...msg,
            content: clientErrorMessage,
            error: true,
          }));
          return;
        }

        consecutiveFailuresRef.current = 0;
        const result = await consumeStream(response, controller);
        if (!mountedRef.current) return;
        // A `startNewConversation` during the stream already reset the thread;
        // applying this turn's terminal state would re-dirty the cleared UI.
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
        headers: await buildChatbotHeaders(),
      });
      if (response.status === 204) {
        // The rows are gone server-side, so a retained id would point at
        // nothing and make the next rehydrate a pointless 404.
        clearConversationId();
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

  /**
   * Replace the visible thread with a persisted conversation loaded on mount
   * (see `useConversationRehydrate`). Ids are minted from this hook's own
   * counter rather than accepted from the caller: two id sources could collide
   * on `assistant-1` and let React reconcile a fresh bubble onto a seeded
   * node — the very hazard the counter exists to prevent.
   *
   * The seed LOSES every race against the live thread. Rehydration is one
   * mount-time round-trip, so a fast typist on a slow API can send a turn while
   * it is still in flight; replacing the thread then would drop the user's
   * message and orphan the in-flight assistant bubble, whose deltas
   * `updateLastAssistant` would silently discard on the id check. Both guards
   * are load-bearing: the ref catches a turn whose append has not committed
   * yet, and the `prev.length` check inside the updater catches an already
   * populated thread (including one seeded by StrictMode's double effect).
   */
  const seedMessages = useCallback(
    (loaded: SeedMessage[]): void => {
      if (loaded.length === 0) return;
      if (inFlightAssistantIdRef.current !== null) return;
      // Minted outside the updater: `nextMessageId` bumps a ref, and updaters
      // must stay pure (StrictMode double-invokes them). A rejected seed just
      // burns a few counter values, which costs nothing — the counter only has
      // to be unique, never contiguous.
      const seeded = loaded.map((m) => {
        const message: ChatbotMessage = {
          id: nextMessageId(m.role),
          role: m.role,
          content: m.content,
        };
        if (m.role === "assistant" && m.sourcesCited?.length) {
          message.sourcesCited = m.sourcesCited;
        }
        return message;
      });
      setMessages((prev) => (prev.length > 0 ? prev : seeded));
    },
    [nextMessageId]
  );

  /**
   * Start a fresh thread. Prior turns stay persisted server-side — this is NOT
   * a delete.
   *
   * Dropping the stored conversation id is the whole mechanism: POST /message
   * continues the thread the client names, so sending no id makes the next
   * turn open a new conversation, and a later reload has nothing to rehydrate.
   * Any in-flight turn is aborted so it cannot stream into the cleared view.
   */
  const startNewConversation = useCallback((): void => {
    // Null the ref BEFORE aborting: `isCurrentTurn()` in the in-flight
    // sendMessage reads it after its await resumes, and must observe that this
    // turn is no longer current.
    const inFlight = abortRef.current;
    abortRef.current = null;
    inFlight?.abort();
    inFlightAssistantIdRef.current = null;
    clearConversationId();
    setMessages([]);
    setState("empty");
    lastEventIdRef.current = undefined;
    consecutiveFailuresRef.current = 0;
  }, []);

  return {
    state,
    messages,
    sendMessage,
    deleteHistory,
    stop,
    seedMessages,
    startNewConversation,
  };
};
