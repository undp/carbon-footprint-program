import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useConversationRehydrate } from "./useConversationRehydrate";
import type { SeedMessage } from "./useChatStream";

const LOAD_URL = "/api/chatbot/conversations/me/current";

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
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useConversationRehydrate", () => {
  it("GETs the current conversation with credentials on mount", async () => {
    fetchMock.mockResolvedValue(makeResponse(204));
    const onLoaded = vi.fn();

    const { result } = renderHook(() => useConversationRehydrate({ onLoaded }));

    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe(LOAD_URL);
    expect(call[1]?.method).toBe("GET");
    expect(call[1]?.credentials).toBe("include");
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

  // 204 (no cookie), 404 (expired / identity mismatch) and transport failures
  // all mean "start empty" — rehydration is an affordance, never fatal.
  const nonSeedingCases: Array<[string, FetchImpl]> = [
    ["204 (no cookie)", () => Promise.resolve(makeResponse(204))],
    ["404 (stale cookie)", () => Promise.resolve(makeResponse(404))],
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
