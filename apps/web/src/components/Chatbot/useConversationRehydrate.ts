import { useEffect, useRef, useState } from "react";
import type { SourceCitationWire } from "@repo/types";
import type { SeedMessage } from "./useChatStream";

const LOAD_URL = "/api/chatbot/conversations/me/current";

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
 * The server reads the signed `chatbot_conversation_id` cookie, checks its TTL
 * and that the request identity matches the row, and returns the thread when
 * valid. 204 (no cookie), 404 (expired / identity mismatch — the response also
 * clears the stale cookie), and transport failures ALL collapse to "start
 * empty": rehydration is an affordance, never a fatal path.
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
    void (async () => {
      try {
        const response = await fetch(LOAD_URL, {
          method: "GET",
          credentials: "include",
        });
        if (cancelled || response.status !== 200) return;
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
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { historyLoading };
};
