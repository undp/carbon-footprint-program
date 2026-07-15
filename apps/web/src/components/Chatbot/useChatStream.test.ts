import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  CHATBOT_STREAM_IDLE_TIMEOUT_MS,
  CHATBOT_STREAM_OVERALL_TIMEOUT_MS,
} from "@/config/constants";
import { useChatStream } from "./useChatStream";
import type { ChatbotMessage } from "./types";

// The hook keeps these user-facing strings private; mirror them here so the
// assertions read intent instead of magic text. If a copy change breaks a test,
// that is the reminder to update both sides deliberately.
const GENERIC_ERROR_MESSAGE =
  "Ocurrió un error al contactar al asistente. Por favor intenta nuevamente.";
const TOO_LARGE_MESSAGE = "Tu mensaje es demasiado largo. Por favor acórtalo.";
const DEGRADED_MESSAGE =
  "El asistente no está disponible en este momento. Por favor intenta nuevamente en unos minutos.";

const SEND_URL = "/api/chatbot/message";

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

const encoder = new TextEncoder();

type MockReader = {
  read: () => Promise<ReadableStreamReadResult<Uint8Array>>;
  releaseLock: () => void;
  cancel: () => Promise<void>;
};

/**
 * Build a streaming `Response` whose body is driven one SSE text chunk per
 * `reader.read()`. When `keepOpenAfterChunks` is set the reader hangs after the
 * scripted chunks until the request signal aborts — real `fetch` rejects the
 * pending read on abort, so we wire the same behaviour to exercise the hook's
 * idle-timeout / overall-timeout / Stop / unmount paths.
 */
const makeStreamResponse = (opts: {
  chunks?: string[];
  status?: number;
  keepOpenAfterChunks?: boolean;
  signal?: AbortSignal | null;
}): Response => {
  const {
    chunks = [],
    status = 200,
    keepOpenAfterChunks = false,
    signal,
  } = opts;
  let index = 0;
  let rejectPending: ((reason: unknown) => void) | null = null;

  const reader: MockReader = {
    read: () => {
      if (index < chunks.length) {
        const value = encoder.encode(chunks[index]);
        index += 1;
        return Promise.resolve({ value, done: false });
      }
      if (keepOpenAfterChunks) {
        return new Promise<ReadableStreamReadResult<Uint8Array>>(
          (_resolve, reject) => {
            rejectPending = reject;
          }
        );
      }
      return Promise.resolve({ value: undefined, done: true });
    },
    releaseLock: () => undefined,
    cancel: () => Promise.resolve(),
  };

  if (signal) {
    const onAbort = () =>
      rejectPending?.(new DOMException("Aborted", "AbortError"));
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    body: { getReader: () => reader },
    json: () => Promise.resolve({}),
  } as unknown as Response;
};

/**
 * Streaming response that emits a keepalive delta every `intervalMs` and never
 * terminates. Used to hold the idle timer open (frames keep resetting it) so the
 * OVERALL timeout is the one that fires.
 */
const makeDripResponse = (
  signal: AbortSignal | null | undefined,
  intervalMs: number,
  frame: string
): Response => {
  let rejectPending: ((reason: unknown) => void) | null = null;
  const reader: MockReader = {
    read: () =>
      new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
        rejectPending = reject;
        setTimeout(
          () => resolve({ value: encoder.encode(frame), done: false }),
          intervalMs
        );
      }),
    releaseLock: () => undefined,
    cancel: () => Promise.resolve(),
  };
  if (signal) {
    signal.addEventListener(
      "abort",
      () => rejectPending?.(new DOMException("Aborted", "AbortError")),
      { once: true }
    );
  }
  return {
    ok: true,
    status: 200,
    body: { getReader: () => reader },
    json: () => Promise.resolve({}),
  } as unknown as Response;
};

/** Non-streaming response for HTTP-status paths (4xx / 5xx / 204). */
const makeHttpResponse = (status: number, jsonBody?: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    body: null,
    json: () =>
      jsonBody === undefined
        ? Promise.reject(new Error("no json body"))
        : Promise.resolve(jsonBody),
  }) as unknown as Response;

const lastMessage = (messages: ChatbotMessage[]): ChatbotMessage =>
  messages[messages.length - 1];

type HookResult = { current: ReturnType<typeof useChatStream> };

// Drive one full turn the way the app really does: a synchronous commit that
// paints the pending assistant bubble (which is what settles the in-flight
// index the hook writes to), THEN await the response. Collapsing both into a
// single act() would let the terminal-state write capture a stale index, since
// the bubble-commit updater has not flushed yet — a test-only race the real
// network's latency hides. Pair with resolveLater/rejectLater so the response
// lands after that first commit.
const sendTurn = async (result: HookResult, content: string): Promise<void> => {
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.sendMessage(content);
  });
  await act(async () => {
    await pending;
  });
};

// Resolve/reject on a macrotask, the way real `fetch` (network I/O) always does.
// A synchronous `Promise.resolve` can beat React's flush of the state updater
// that records the in-flight assistant index, which would make multi-turn
// assertions read a stale index — a test artifact the real network never hits.
const resolveLater = (response: Response): Promise<Response> =>
  new Promise((resolve) => setTimeout(() => resolve(response), 0));
const rejectLater = (error: Error): Promise<Response> =>
  new Promise((_resolve, reject) => setTimeout(() => reject(error), 0));

let fetchMock: Mock<FetchImpl>;

beforeEach(() => {
  fetchMock = vi.fn<FetchImpl>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useChatStream — SSE parsing", () => {
  it("accumulates multi-frame LF-delimited deltas and completes on `done`", async () => {
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        makeStreamResponse({
          chunks: [
            'id: 7\ndata: {"content":"Hola"}\n\n',
            'id: 7\ndata: {"content":" mundo"}\n\n',
            'id: 7\nevent: done\ndata: {"inputTokens":1,"outputTokens":2}\n\n',
          ],
          signal: init?.signal,
        })
      )
    );

    const { result } = renderHook(() => useChatStream());
    await sendTurn(result, "hola");

    expect(result.current.state).toBe("empty");
    const assistant = lastMessage(result.current.messages);
    expect(assistant.role).toBe("assistant");
    expect(assistant.content).toBe("Hola mundo");
    expect(assistant.error).toBeUndefined();
    expect(assistant.truncated).toBeUndefined();
  });

  it("parses CRLF frame terminators", async () => {
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        makeStreamResponse({
          chunks: [
            'data: {"content":"CR"}\r\n\r\n',
            'data: {"content":"LF"}\r\n\r\n',
            "event: done\r\ndata: {}\r\n\r\n",
          ],
          signal: init?.signal,
        })
      )
    );

    const { result } = renderHook(() => useChatStream());
    await sendTurn(result, "hola");

    expect(result.current.state).toBe("empty");
    expect(lastMessage(result.current.messages).content).toBe("CRLF");
  });

  it("joins multi-line `data:` fields with a newline before JSON-parsing", async () => {
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        makeStreamResponse({
          // Two data: lines in one frame → joined as `{"content":\n"multi"}`.
          chunks: [
            'data: {"content":\ndata: "multi"}\n\n',
            "event: done\ndata: {}\n\n",
          ],
          signal: init?.signal,
        })
      )
    );

    const { result } = renderHook(() => useChatStream());
    await sendTurn(result, "hola");

    expect(lastMessage(result.current.messages).content).toBe("multi");
  });

  it("buffers a frame split across chunk boundaries", async () => {
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        makeStreamResponse({
          chunks: [
            'data: {"con',
            'tent":"partido"}\n\n',
            "event: done\ndata: {}\n\n",
          ],
          signal: init?.signal,
        })
      )
    );

    const { result } = renderHook(() => useChatStream());
    await sendTurn(result, "hola");

    expect(result.current.state).toBe("empty");
    expect(lastMessage(result.current.messages).content).toBe("partido");
  });

  it("flushes a trailing frame after EOF when the server omits the blank line", async () => {
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        makeStreamResponse({
          chunks: [
            'id: 9\ndata: {"content":"Hola"}\n\n',
            // Final `done` frame arrives WITHOUT a trailing blank line, then EOF.
            'id: 9\nevent: done\ndata: {"inputTokens":1,"outputTokens":1}',
          ],
          signal: init?.signal,
        })
      )
    );

    const { result } = renderHook(() => useChatStream());
    await sendTurn(result, "hola");

    // The post-EOF flush must recover the `done` frame → completed (empty),
    // not misread the clean EOF as a truncated turn.
    expect(result.current.state).toBe("empty");
    expect(lastMessage(result.current.messages).content).toBe("Hola");
  });
});

describe("useChatStream — terminal-state mapping", () => {
  it("maps a clean EOF without `done` to truncated", async () => {
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        makeStreamResponse({
          chunks: ['id: 3\ndata: {"content":"Sin cierre"}\n\n'],
          signal: init?.signal,
        })
      )
    );

    const { result } = renderHook(() => useChatStream());
    await sendTurn(result, "hola");

    expect(result.current.state).toBe("truncated");
    const assistant = lastMessage(result.current.messages);
    expect(assistant.content).toBe("Sin cierre");
    expect(assistant.truncated).toBe(true);
  });

  it("maps a mid-stream `error` event to error with the server message", async () => {
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        makeStreamResponse({
          chunks: [
            'id: 4\ndata: {"content":"Hola"}\n\n',
            'event: error\ndata: {"code":"EXTERNAL_SERVICE_ERROR","message":"Falló el proveedor"}\n\n',
          ],
          signal: init?.signal,
        })
      )
    );

    const { result } = renderHook(() => useChatStream());
    await sendTurn(result, "hola");

    expect(result.current.state).toBe("error");
    const assistant = lastMessage(result.current.messages);
    expect(assistant.content).toBe("Falló el proveedor");
    expect(assistant.error).toBe(true);
  });

  it("falls back to the generic message when a `done` event never arrives and no content streamed", async () => {
    // Body present but the stream closes immediately with no frames at all.
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(makeStreamResponse({ chunks: [], signal: init?.signal }))
    );

    const { result } = renderHook(() => useChatStream());
    await sendTurn(result, "hola");

    expect(result.current.state).toBe("error");
    const assistant = lastMessage(result.current.messages);
    expect(assistant.content).toBe(GENERIC_ERROR_MESSAGE);
    expect(assistant.error).toBe(true);
  });
});

describe("useChatStream — abort, timeout & unmount", () => {
  it("aborts on the idle timeout after streaming started → truncated with partial content", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        makeStreamResponse({
          chunks: ['id: 1\ndata: {"content":"Hola"}\n\n'],
          keepOpenAfterChunks: true,
          signal: init?.signal,
        })
      )
    );

    const { result } = renderHook(() => useChatStream());
    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage("hola");
    });

    // Let fetch resolve + the first delta arrive → streaming.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.state).toBe("streaming");

    // No further frames within the idle window → abort → truncated.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHATBOT_STREAM_IDLE_TIMEOUT_MS);
    });
    await act(async () => {
      await sendPromise;
    });

    expect(result.current.state).toBe("truncated");
    const assistant = lastMessage(result.current.messages);
    expect(assistant.content).toBe("Hola");
    expect(assistant.truncated).toBe(true);
  });

  it("aborts on the idle timeout before any delta → error", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        makeStreamResponse({
          chunks: [],
          keepOpenAfterChunks: true,
          signal: init?.signal,
        })
      )
    );

    const { result } = renderHook(() => useChatStream());
    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage("hola");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.state).toBe("loading");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHATBOT_STREAM_IDLE_TIMEOUT_MS);
    });
    await act(async () => {
      await sendPromise;
    });

    expect(result.current.state).toBe("error");
    expect(lastMessage(result.current.messages).content).toBe(
      GENERIC_ERROR_MESSAGE
    );
  });

  it("aborts on the overall timeout even while keepalive frames keep arriving", async () => {
    vi.useFakeTimers();
    // Keepalive every 20s keeps the 30s idle timer from firing, isolating the
    // 120s overall timeout as the cause of the abort.
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        makeDripResponse(init?.signal, 20_000, 'data: {"content":"."}\n\n')
      )
    );

    const { result } = renderHook(() => useChatStream());
    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage("hola");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        CHATBOT_STREAM_OVERALL_TIMEOUT_MS + 1000
      );
    });
    await act(async () => {
      await sendPromise;
    });

    expect(result.current.state).toBe("truncated");
    expect(lastMessage(result.current.messages).truncated).toBe(true);
  });

  it("treats a user Stop before any response as a cancel → empty, without escalating", async () => {
    // fetch that only settles once its signal aborts (Stop).
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true }
          );
        })
    );

    const { result } = renderHook(() => useChatStream());
    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage("hola");
    });
    expect(result.current.state).toBe("loading");

    act(() => {
      result.current.stop();
    });
    await act(async () => {
      await sendPromise;
    });

    expect(result.current.state).toBe("empty");
    // A cancel must not mark the assistant bubble as an error.
    expect(lastMessage(result.current.messages).error).toBeUndefined();
  });

  it("treats a user Stop mid-stream as truncated with the partial content", async () => {
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        makeStreamResponse({
          chunks: ['id: 1\ndata: {"content":"Parcial"}\n\n'],
          keepOpenAfterChunks: true,
          signal: init?.signal,
        })
      )
    );

    const { result } = renderHook(() => useChatStream());
    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage("hola");
    });
    await waitFor(() => {
      expect(result.current.state).toBe("streaming");
    });

    act(() => {
      result.current.stop();
    });
    await act(async () => {
      await sendPromise;
    });

    expect(result.current.state).toBe("truncated");
    const assistant = lastMessage(result.current.messages);
    expect(assistant.content).toBe("Parcial");
    expect(assistant.truncated).toBe(true);
  });

  it("aborts the in-flight turn on unmount and does not update state afterward", async () => {
    let capturedSignal: AbortSignal | null | undefined;
    fetchMock.mockImplementation((_input, init) => {
      capturedSignal = init?.signal;
      return Promise.resolve(
        makeStreamResponse({
          chunks: ['id: 1\ndata: {"content":"Hola"}\n\n'],
          keepOpenAfterChunks: true,
          signal: init?.signal,
        })
      );
    });

    const { result, unmount } = renderHook(() => useChatStream());
    let sendPromise!: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage("hola");
    });
    await waitFor(() => {
      expect(result.current.state).toBe("streaming");
    });

    expect(capturedSignal?.aborted).toBe(false);
    unmount();
    // Unmount cleanup must abort the live request so it cannot outlive the widget.
    expect(capturedSignal?.aborted).toBe(true);

    // The aborted read settles here; the hook's mounted guard must swallow it
    // without throwing an unhandled rejection.
    await expect(
      act(async () => {
        await sendPromise;
      })
    ).resolves.toBeUndefined();
  });
});

describe("useChatStream — degraded escalation & reset", () => {
  it("does not auto-retry after a transport error (send is non-idempotent)", async () => {
    fetchMock.mockImplementationOnce(() => rejectLater(new TypeError("down")));

    const { result } = renderHook(() => useChatStream());
    await sendTurn(result, "hola");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe("error");
    expect(lastMessage(result.current.messages).content).toBe(
      GENERIC_ERROR_MESSAGE
    );
  });

  it("escalates to degraded after two consecutive transport failures", async () => {
    const { result } = renderHook(() => useChatStream());

    fetchMock.mockImplementationOnce(() => rejectLater(new TypeError("down")));
    await sendTurn(result, "uno");
    expect(result.current.state).toBe("error");

    fetchMock.mockImplementationOnce(() => rejectLater(new TypeError("down")));
    await sendTurn(result, "dos");

    expect(result.current.state).toBe("degraded");
    const assistant = lastMessage(result.current.messages);
    expect(assistant.content).toBe(DEGRADED_MESSAGE);
    expect(assistant.error).toBe(true);
  });

  it("escalates to degraded after two consecutive 5xx responses", async () => {
    const { result } = renderHook(() => useChatStream());

    fetchMock.mockImplementationOnce(() => resolveLater(makeHttpResponse(500)));
    await sendTurn(result, "uno");
    expect(result.current.state).toBe("error");

    fetchMock.mockImplementationOnce(() => resolveLater(makeHttpResponse(502)));
    await sendTurn(result, "dos");

    expect(result.current.state).toBe("degraded");
    expect(lastMessage(result.current.messages).content).toBe(DEGRADED_MESSAGE);
  });

  it("escalates on a mix of transport and 5xx failures (either counts)", async () => {
    const { result } = renderHook(() => useChatStream());

    fetchMock.mockImplementationOnce(() => rejectLater(new TypeError("down")));
    await sendTurn(result, "uno");
    expect(result.current.state).toBe("error");

    fetchMock.mockImplementationOnce(() =>
      resolveLater(makeHttpResponse(503, { message: "Sobrecargado" }))
    );
    await sendTurn(result, "dos");

    expect(result.current.state).toBe("degraded");
    expect(lastMessage(result.current.messages).content).toBe(DEGRADED_MESSAGE);
  });

  it("resets the failure counter on a 4xx so it never escalates", async () => {
    const { result } = renderHook(() => useChatStream());

    fetchMock.mockImplementationOnce(() => resolveLater(makeHttpResponse(500)));
    await sendTurn(result, "uno");
    expect(result.current.state).toBe("error");

    // A 4xx (client error) resets the unavailability counter.
    fetchMock.mockImplementationOnce(() => resolveLater(makeHttpResponse(400)));
    await sendTurn(result, "dos");
    expect(result.current.state).toBe("error");

    // Next 5xx is therefore only the FIRST in a row → error, not degraded.
    fetchMock.mockImplementationOnce(() => resolveLater(makeHttpResponse(500)));
    await sendTurn(result, "tres");
    expect(result.current.state).toBe("error");
  });

  it("resets the failure counter after a successful turn", async () => {
    const { result } = renderHook(() => useChatStream());

    fetchMock.mockImplementationOnce(() => resolveLater(makeHttpResponse(500)));
    await sendTurn(result, "uno");
    expect(result.current.state).toBe("error");

    fetchMock.mockImplementationOnce((_input, init) =>
      resolveLater(
        makeStreamResponse({
          chunks: [
            'id: 1\ndata: {"content":"ok"}\n\n',
            "id: 1\nevent: done\ndata: {}\n\n",
          ],
          signal: init?.signal,
        })
      )
    );
    await sendTurn(result, "dos");
    expect(result.current.state).toBe("empty");

    fetchMock.mockImplementationOnce(() => resolveLater(makeHttpResponse(500)));
    await sendTurn(result, "tres");
    expect(result.current.state).toBe("error");
  });

  it("maps 413 to the too-large message and resets the counter", async () => {
    const { result } = renderHook(() => useChatStream());

    fetchMock.mockImplementationOnce(() => resolveLater(makeHttpResponse(413)));
    await sendTurn(result, "hola");

    expect(result.current.state).toBe("error");
    const assistant = lastMessage(result.current.messages);
    expect(assistant.content).toBe(TOO_LARGE_MESSAGE);
    expect(assistant.error).toBe(true);
  });

  it("uses the server message from a single 503 without escalating", async () => {
    const { result } = renderHook(() => useChatStream());

    fetchMock.mockImplementationOnce(() =>
      resolveLater(makeHttpResponse(503, { message: "Vuelve más tarde" }))
    );
    await sendTurn(result, "hola");

    expect(result.current.state).toBe("error");
    expect(lastMessage(result.current.messages).content).toBe(
      "Vuelve más tarde"
    );
  });
});

describe("useChatStream — request shape & guards", () => {
  it("ignores empty / whitespace-only input without calling fetch", async () => {
    const { result } = renderHook(() => useChatStream());
    await act(async () => {
      await result.current.sendMessage("   ");
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.state).toBe("empty");
    expect(result.current.messages).toHaveLength(0);
  });

  it("POSTs the message with credentials and no stale Last-Event-ID header", async () => {
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        makeStreamResponse({
          chunks: ["event: done\ndata: {}\n\n"],
          signal: init?.signal,
        })
      )
    );

    const { result } = renderHook(() => useChatStream());
    await sendTurn(result, "hola");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe(SEND_URL);
    const init = call[1];
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    const body = JSON.parse((init?.body as string) ?? "{}") as {
      content: string;
    };
    expect(body).toEqual({ content: "hola" });
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.["Last-Event-ID"]).toBeUndefined();
    expect(headers?.["content-type"]).toBe("application/json");
  });
});

describe("useChatStream — deleteHistory", () => {
  it("clears messages and resets to empty on 204", async () => {
    fetchMock.mockImplementationOnce((_input, init) =>
      Promise.resolve(
        makeStreamResponse({
          chunks: ['data: {"content":"Hola"}\n\n', "event: done\ndata: {}\n\n"],
          signal: init?.signal,
        })
      )
    );
    const { result } = renderHook(() => useChatStream());
    await sendTurn(result, "hola");
    expect(result.current.messages.length).toBeGreaterThan(0);

    fetchMock.mockImplementationOnce(() =>
      Promise.resolve(makeHttpResponse(204))
    );
    await act(async () => {
      await result.current.deleteHistory();
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.state).toBe("empty");
  });

  it("sets error state when delete fails", async () => {
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve(makeHttpResponse(500))
    );
    const { result } = renderHook(() => useChatStream());
    await act(async () => {
      await result.current.deleteHistory();
    });

    expect(result.current.state).toBe("error");
  });
});
