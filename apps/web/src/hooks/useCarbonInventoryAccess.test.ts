import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { GetCarbonInventoryAccessResponse } from "@repo/types";
import { useCarbonInventoryAccess } from "./useCarbonInventoryAccess";

// Mock only the query hook the access hook depends on. `vi.hoisted` gives the
// mock fn a stable identity that the hoisted `vi.mock` factory can close over.
const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock("@/api/query", () => ({ useCarbonInventoryAccessQuery: queryMock }));

type Resp = GetCarbonInventoryAccessResponse;
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

const runHook = (id = "inv-1") =>
  renderHook(() => useCarbonInventoryAccess(id)).result.current;

beforeEach(() => queryMock.mockReset());

describe("useCarbonInventoryAccess", () => {
  it("is not ready while the query is loading, but is accessible by default", () => {
    queryMock.mockReturnValue(queryState({ isLoading: true }));

    expect(runHook()).toEqual({
      isReady: false,
      canAccess: true,
      canEdit: false,
      hasMembership: false,
    });
  });

  it("denies access and edit when the query errors (e.g. 403)", () => {
    queryMock.mockReturnValue(queryState({ isError: true }));

    expect(runHook()).toEqual({
      isReady: true,
      canAccess: false,
      canEdit: false,
      hasMembership: false,
    });
  });

  it("grants edit and membership when the server allows it", () => {
    queryMock.mockReturnValue(
      queryState({ data: { canEdit: true, membership: { role: "ADMIN" } } })
    );

    expect(runHook()).toEqual({
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

    expect(runHook()).toEqual({
      isReady: true,
      canAccess: true,
      canEdit: false,
      hasMembership: false,
    });
  });

  it("defaults edit/membership to false when settled with no data", () => {
    queryMock.mockReturnValue(queryState({ data: undefined }));

    expect(runHook()).toEqual({
      isReady: true,
      canAccess: true,
      canEdit: false,
      hasMembership: false,
    });
  });

  it("lets an error override an otherwise-permissive payload", () => {
    // `isError` short-circuits canEdit/hasMembership even if data says yes.
    queryMock.mockReturnValue(
      queryState({
        isError: true,
        data: { canEdit: true, membership: { role: "ADMIN" } },
      })
    );

    expect(runHook()).toEqual({
      isReady: true,
      canAccess: false,
      canEdit: false,
      hasMembership: false,
    });
  });
});
