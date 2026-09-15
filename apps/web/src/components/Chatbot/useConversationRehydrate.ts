import { useEffect, useRef, useState } from "react";
import type { SourceCitationWire } from "@repo/types";
import { CHATBOT_REHYDRATE_TIMEOUT_MS } from "@/config/constants";
import { API_BASE_URL } from "@/config/environment";
import { buildChatbotHeaders } from "./authHeaders";
import { clearConversationId, readConversationId } from "./conversationStore";
import type { SeedMessage } from "./useChatStream";

// Absolute for the same reason as the URLs in useChatStream.ts — see the note
// there. This one failed the most quietly: against a static host with no /api
// route, the relative path hit the SPA navigation fallback and returned 200
// with an HTML body rather than any error.
const LOAD_URL = `${API_BASE_URL}/chatbot/conversations/me/current`;

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

type UseConversationRehydrateOptions = {
  /** Called once with the persisted thread when one is loaded. */
  onLoaded: (messages: SeedMessage[]) => void;
};

type UseConversationRehydrateResult = {
  /**
   * True from mount until the rehydrate request settles (200 / 204 / 404 /
   * transport error). The widget reads it to suppress the
   * "¿En qué puedo ayudarte?" placeholder, so a populated thread does not
   * flash empty before the seed lands.
   */
  historyLoading: boolean;
};

/**
 * Load the caller's persisted conversation once on mount.
 *
 * The client names the thread it wants; the server checks its TTL and that the
 * request identity matches the row, and returns it when valid. No stored id,
 * 404 (expired / identity mismatch — the stale id is dropped here so the next
 * reload does not repeat the miss), and transport failures ALL collapse to
 * "start empty": rehydration is an affordance, never a fatal path.
 *
 * Kept separate from `useChatStream` on purpose. Folding this fetch into that
 * hook would make every one of its turn-streaming tests observe an extra
 * mount-time `fetch`, shifting their mocked response queues.
 */
export const useConversationRehydrate = ({
  onLoaded,
}: UseConversationRehydrateOptions): UseConversationRehydrateResult => {
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  // Held in a ref so a caller passing an inline closure cannot re-trigger the
  // mount-only effect (and re-seed the thread) on every render. `useRef` seeds
  // it with the first value, and this effect keeps it current — writing the ref
  // during render would violate `react-hooks/refs`. Declared before the fetch
  // effect so it is applied first on mount.
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    let cancelled = false;
    // Bounds the request and ties it to unmount. Without it a server that
    // accepts the connection and then hangs never settles the promise, so the
    // `finally` below never runs and `historyLoading` stays true for the life
    // of the page — a permanently blank panel rather than an empty one.
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      CHATBOT_REHYDRATE_TIMEOUT_MS
    );
    void (async () => {
      const conversationId = readConversationId();
      if (conversationId === null) {
        // Nothing to rehydrate — a first visit, or one that just started a new
        // conversation. Skipping the round-trip entirely is the point of
        // holding the id client-side; the server could not have answered
        // anything but 204.
        clearTimeout(timer);
        setHistoryLoading(false);
        return;
      }
      try {
        const response = await fetch(
          `${LOAD_URL}?conversationId=${encodeURIComponent(conversationId)}`,
          {
            method: "GET",
            credentials: "include",
            headers: await buildChatbotHeaders(),
            signal: controller.signal,
          }
        );
        if (cancelled) return;
        if (response.status === 404) {
          // The row expired, was deleted, or belongs to another identity. Drop
          // the pointer so the next turn opens a fresh thread instead of
          // naming one that will never resolve.
          clearConversationId();
          return;
        }
        if (response.status !== 200) return;
        const body = (await response.json()) as LoadedConversationResponse;
        if (cancelled) return;
        onLoadedRef.current(
          body.messages.map((m) => ({
            role:
              m.role === "USER" ? ("user" as const) : ("assistant" as const),
            content: m.content,
            sourcesCited: m.sourcesCited,
          }))
        );
      } catch {
        // Best-effort: a transport failure or malformed body means we start
        // visually empty, not in an error state.
      } finally {
        clearTimeout(timer);
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return { historyLoading };
};
