import { useCallback, useRef, useState } from "react";
import type { ChatbotMessage, ChatbotState, SendMessageResult } from "./types";

const SEND_URL = "/api/chatbot/message";
const DELETE_URL = "/api/chatbot/conversations/me";

const GENERIC_ERROR_MESSAGE =
  "Ocurrió un error al contactar al asistente. Por favor intenta nuevamente.";
const TOO_LARGE_MESSAGE = "Tu mensaje es demasiado largo. Por favor acórtalo.";
const DEGRADED_MESSAGE =
  "El asistente no está disponible en este momento. Recarga la página o intenta más tarde.";

type SsePayload = {
  id?: string;
  event?: string;
  data: string;
};

const parseEvents = (
  buffer: string
): { events: SsePayload[]; rest: string } => {
  const events: SsePayload[] = [];
  let rest = buffer;
  let separator = rest.indexOf("\n\n");
  while (separator !== -1) {
    const block = rest.slice(0, separator);
    rest = rest.slice(separator + 2);
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
    separator = rest.indexOf("\n\n");
  }
  return { events, rest };
};

export const useChatStream = () => {
  const [state, setState] = useState<ChatbotState>("empty");
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const consecutiveFailuresRef = useRef(0);
  const lastEventIdRef = useRef<string | undefined>(undefined);

  const updateLastAssistant = useCallback(
    (mutator: (msg: ChatbotMessage) => ChatbotMessage) => {
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === "assistant") {
            next[i] = mutator(next[i]);
            break;
          }
        }
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
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events, rest } = parseEvents(buffer);
          buffer = rest;
          for (const ev of events) {
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
            // Default: a content delta.
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
          }
        }
      } catch {
        return firstChunkSeen
          ? { kind: "truncated" }
          : { kind: "error", message: GENERIC_ERROR_MESSAGE };
      } finally {
        reader.releaseLock();
      }
      return firstChunkSeen
        ? { kind: "completed" }
        : { kind: "error", message: GENERIC_ERROR_MESSAGE };
    },
    [updateLastAssistant]
  );

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      if (!content.trim()) return;
      const userMessage: ChatbotMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };
      const assistantMessage: ChatbotMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
      };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setState("loading");

      const attempt = async (
        withLastEventId: boolean
      ): Promise<{ response: Response | null; transportError: boolean }> => {
        const headers: Record<string, string> = {
          "content-type": "application/json",
        };
        if (withLastEventId && lastEventIdRef.current) {
          headers["Last-Event-ID"] = lastEventIdRef.current;
        }
        try {
          const response = await fetch(SEND_URL, {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify({ content }),
          });
          return { response, transportError: false };
        } catch {
          return { response: null, transportError: true };
        }
      };

      const initialAttempt = await attempt(false);
      let response = initialAttempt.response;
      if (initialAttempt.transportError) {
        const retry = await attempt(true);
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
        setState("error");
        return;
      }

      if (!response.ok) {
        consecutiveFailuresRef.current = 0;
        if (response.status === 413) {
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
          setState("error");
          updateLastAssistant((msg) => ({ ...msg, content: serverMessage }));
          return;
        }
        setState("error");
        updateLastAssistant((msg) => ({
          ...msg,
          content: GENERIC_ERROR_MESSAGE,
        }));
        return;
      }

      consecutiveFailuresRef.current = 0;
      const result = await consumeStream(response);

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
    },
    [consumeStream, updateLastAssistant]
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
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }, []);

  return { state, messages, sendMessage, deleteHistory };
};
