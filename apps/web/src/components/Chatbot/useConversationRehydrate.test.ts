import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  clearConversationId,
  readConversationId,
  writeConversationId,
} from "./conversationStore";
import { useConversationRehydrate } from "./useConversationRehydrate";
import type { SeedMessage } from "./useChatStream";

// Mirrors VITE_API_BASE_URL in vitest.config.ts — see the note in
// useChatStream.test.ts.
const LOAD_URL = "http://localhost/api/chatbot/conversations/me/current";
const STORED_ID = "1";
const EXPECTED_URL = `${LOAD_URL}?conversationId=${STORED_ID}`;

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

const makeResponse = (status: number, jsonBody?: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () =>
      jsonBody === undefined
        ? Promise.reject(new Error("no json body"))
        : Promise.resolve(jsonBody),
  }) as unknown as Response;

const conversation = {
  id: "1",
  createdAt: "2026-07-01T00:00:00.000Z",
  expiresAt: "2026-08-01T00:00:00.000Z",
};

let fetchMock: Mock<FetchImpl>;

beforeEach(() => {
  fetchMock = vi.fn<FetchImpl>();
  vi.stubGlobal("fetch", fetchMock);
  clearConversationId();
  // Every case below except the explicit "nothing stored" one needs a thread
  // to ask for — without an id the hook skips the request entirely.
  writeConversationId(STORED_ID);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useConversationRehydrate", () => {
  it("GETs the stored conversation with credentials on mount", async () => {
    fetchMock.mockResolvedValue(makeResponse(204));
    const onLoaded = vi.fn();

    const { result } = renderHook(() => useConversationRehydrate({ onLoaded }));

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe(EXPECTED_URL);
    expect(call[1]?.method).toBe("GET");
    expect(call[1]?.credentials).toBe("include");
  });

  it("issues no request at all when no conversation is stored", async () => {
    clearConversationId();
    const onLoaded = vi.fn();

    const { result } = renderHook(() => useConversationRehydrate({ onLoaded }));

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    // Holding the id client-side is what makes this knowable without asking:
    // a first visit has nothing to rehydrate, so it should cost no round-trip.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it("drops a stored id the server no longer recognizes", async () => {
    fetchMock.mockResolvedValue(makeResponse(404));

    const { result } = renderHook(() =>
      useConversationRehydrate({ onLoaded: vi.fn() })
    );

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    // Expired, deleted, or owned by another identity — keeping it would repeat
    // the same miss on every reload and pin the next turn to a dead thread.
    expect(readConversationId()).toBeNull();
  });

  it("seeds the persisted thread on 200, mapping roles and citations", async () => {
    const sources = [
      {
        source_id: "1",
        chunk_id: "9",
        cite_label: "GHG cap. 4",
        cite_url: "https://x/1",
      },
    ];
    fetchMock.mockResolvedValue(
      makeResponse(200, {
        conversation,
        messages: [
          {
            id: "1",
            role: "USER",
            content: "hola",
            sourcesCited: [],
            createdAt: conversation.createdAt,
          },
          {
            id: "2",
            role: "ASSISTANT",
            content: "respuesta",
            sourcesCited: sources,
            createdAt: conversation.createdAt,
          },
        ],
      })
    );
    const onLoaded = vi.fn();

    const { result } = renderHook(() => useConversationRehydrate({ onLoaded }));

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    expect(onLoaded).toHaveBeenCalledTimes(1);
    const seeded = onLoaded.mock.calls[0][0] as SeedMessage[];
    expect(seeded).toEqual([
      { role: "user", content: "hola", sourcesCited: [] },
      { role: "assistant", content: "respuesta", sourcesCited: sources },
    ]);
  });

  // 204 (server has nothing), 404 (expired / identity mismatch) and transport
  // failures all mean "start empty" — rehydration is an affordance, never fatal.
  const nonSeedingCases: Array<[string, FetchImpl]> = [
    ["204 (nothing to return)", () => Promise.resolve(makeResponse(204))],
    ["404 (stale id)", () => Promise.resolve(makeResponse(404))],
    ["a transport failure", () => Promise.reject(new Error("offline"))],
  ];

  it.each(nonSeedingCases)(
    "does not seed and clears loading on %s",
    async (_label, impl) => {
      fetchMock.mockImplementation(impl);
      const onLoaded = vi.fn();

      const { result } = renderHook(() =>
        useConversationRehydrate({ onLoaded })
      );

      await waitFor(() => expect(result.current.historyLoading).toBe(false));
      expect(onLoaded).not.toHaveBeenCalled();
    }
  );

  it("does not seed when a malformed 200 body throws while mapping", async () => {
    fetchMock.mockResolvedValue(makeResponse(200, { conversation }));
    const onLoaded = vi.fn();

    const { result } = renderHook(() => useConversationRehydrate({ onLoaded }));

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it("fetches once even when the caller passes a new closure each render", async () => {
    fetchMock.mockResolvedValue(makeResponse(204));

    const { result, rerender } = renderHook(() =>
      useConversationRehydrate({ onLoaded: () => undefined })
    );

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    rerender();
    rerender();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
