import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { IFuseOptions } from "fuse.js";
import { DEFAULT_SEARCH_DEBOUNCE_MS } from "@/config/constants";
import { useFuzzySearch } from "./useFuzzySearch";

// Fixed dataset whose two entries are far enough apart (edit-distance-wise) that
// a whole-word query matches exactly one under Fuse's default 0.4 threshold.
// (e.g. "Manzana"/"Banana" would both match either query — too similar.)
interface Fruit {
  name: string;
}

const dataset: Fruit[] = [{ name: "Manzana" }, { name: "Kiwi" }];
const fuseOptions: IFuseOptions<Fruit> = { keys: ["name"] };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useFuzzySearch — imperative search", () => {
  it("returns only the matching item for a query", () => {
    const { result } = renderHook(() =>
      useFuzzySearch(dataset, { fuseOptions })
    );

    expect(result.current.search("Manzana")).toEqual([{ name: "Manzana" }]);
    expect(result.current.search("Kiwi")).toEqual([{ name: "Kiwi" }]);
  });

  it("returns the full options array (same reference) for an empty query", () => {
    const { result } = renderHook(() =>
      useFuzzySearch(dataset, { fuseOptions })
    );

    // Empty query short-circuits Fuse and hands back the original array.
    expect(result.current.search("")).toBe(dataset);
  });

  it("returns all options for a whitespace-only query (normalized to empty)", () => {
    const { result } = renderHook(() =>
      useFuzzySearch(dataset, { fuseOptions })
    );

    expect(result.current.search("   ")).toBe(dataset);
    expect(result.current.search("\t\n ")).toBe(dataset);
  });
});

describe("useFuzzySearch — reactive results", () => {
  it("returns all options and skips the debounce effect when query is undefined", () => {
    const { result } = renderHook(() =>
      useFuzzySearch(dataset, { fuseOptions })
    );

    // query === undefined → results is the options array itself.
    expect(result.current.results).toBe(dataset);

    // The debounce effect early-returns, so advancing time changes nothing.
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SEARCH_DEBOUNCE_MS * 10);
    });
    expect(result.current.results).toBe(dataset);
  });

  it("filters results only after the debounce window elapses", () => {
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) =>
        useFuzzySearch(dataset, { fuseOptions, query }),
      { initialProps: { query: "" } }
    );

    // Empty initial query → debounced value "" → all options.
    expect(result.current.results).toEqual(dataset);

    rerender({ query: "Manzana" });
    // Debounce has not fired yet: still the unfiltered list.
    expect(result.current.results).toEqual(dataset);

    act(() => {
      vi.advanceTimersByTime(DEFAULT_SEARCH_DEBOUNCE_MS);
    });
    expect(result.current.results).toEqual([{ name: "Manzana" }]);
  });

  it("honors a custom debounceMs before applying the query", () => {
    const debounceMs = 1000;
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) =>
        useFuzzySearch(dataset, { fuseOptions, query, debounceMs }),
      { initialProps: { query: "" } }
    );

    rerender({ query: "Kiwi" });

    act(() => {
      vi.advanceTimersByTime(debounceMs - 1);
    });
    // One millisecond short of the window → not yet applied.
    expect(result.current.results).toEqual(dataset);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.results).toEqual([{ name: "Kiwi" }]);
  });
});
