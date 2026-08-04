import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { GetReductionProjectAccessResponse } from "@repo/types";
import { useReductionProjectAccess } from "./useReductionProjectAccess";

// Mock only the query hook the access hook depends on. `vi.hoisted` gives the
// mock fn a stable identity that the hoisted `vi.mock` factory can close over.
const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock("@/api/query/reductionProjects", () => ({
  useReductionProjectAccessQuery: queryMock,
}));

type Resp = GetReductionProjectAccessResponse;
type QueryResult = UseQueryResult<Resp>;

// The access hook reads only `data` / `isLoading` / `isError`; build just those
// and assert the full query-result shape (the rest is never touched).
const queryState = (parts: {
  data?: Resp;
  isLoading?: boolean;
  isError?: boolean;
}): QueryResult =>
  ({
    data: parts.data,
    isLoading: parts.isLoading ?? false,
    isError: parts.isError ?? false,
  }) as unknown as QueryResult;

const runHook = (id: string | undefined) =>
  renderHook(() => useReductionProjectAccess(id)).result.current;

beforeEach(() => queryMock.mockReset());

describe("useReductionProjectAccess", () => {
  describe("create mode (no projectId)", () => {
    it("is ready and accessible with nothing to access-check", () => {
      // Query is disabled server-side; even a lingering loading flag is ignored.
      queryMock.mockReturnValue(queryState({ isLoading: true }));

      expect(runHook(undefined)).toEqual({
        isReady: true,
        canAccess: true,
        canEdit: false,
        hasMembership: false,
      });
    });

    it("stays accessible even if the (disabled) query reports an error", () => {
      queryMock.mockReturnValue(queryState({ isError: true }));

      expect(runHook(undefined)).toEqual({
        isReady: true,
        canAccess: true,
        canEdit: false,
        hasMembership: false,
      });
    });
  });

  describe("edit mode (with projectId)", () => {
    it("is not ready while loading, but accessible by default", () => {
      queryMock.mockReturnValue(queryState({ isLoading: true }));

      expect(runHook("proj-1")).toEqual({
        isReady: false,
        canAccess: true,
        canEdit: false,
        hasMembership: false,
      });
    });

    it("denies access and edit when the query errors (e.g. 403)", () => {
      queryMock.mockReturnValue(queryState({ isError: true }));

      expect(runHook("proj-1")).toEqual({
        isReady: true,
        canAccess: false,
        canEdit: false,
        hasMembership: false,
      });
    });

    it("grants edit and membership when the server allows it", () => {
      queryMock.mockReturnValue(
        queryState({
          data: { canEdit: true, membership: { role: "CONTRIBUTOR" } },
        })
      );

      expect(runHook("proj-1")).toEqual({
        isReady: true,
        canAccess: true,
        canEdit: true,
        hasMembership: true,
      });
    });

    it("reflects a read-only, non-member response", () => {
      queryMock.mockReturnValue(
        queryState({ data: { canEdit: false, membership: null } })
      );

      expect(runHook("proj-1")).toEqual({
        isReady: true,
        canAccess: true,
        canEdit: false,
        hasMembership: false,
      });
    });

    it("defaults edit/membership to false when settled with no data", () => {
      queryMock.mockReturnValue(queryState({ data: undefined }));

      expect(runHook("proj-1")).toEqual({
        isReady: true,
        canAccess: true,
        canEdit: false,
        hasMembership: false,
      });
    });
  });
});
