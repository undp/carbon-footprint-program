import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import {
  useMaintainerRowReorder,
  type ReorderableRow,
} from "./useMaintainerRowReorder";

const enqueueSnackbar = vi.fn();

vi.mock("notistack", () => ({
  useSnackbar: () => ({ enqueueSnackbar }),
}));

interface TestRow extends ReorderableRow {
  categoryId: string;
}

const row = (
  id: string,
  position: number | null,
  categoryId = "c1"
): TestRow => ({ id, position, categoryId });

const byCategory = (r: TestRow) => r.categoryId;

/**
 * A swap whose promise the test settles by hand, so the window between the
 * click and the replayed order — the one `isMoveBlocked` covers — can be
 * inspected instead of raced.
 */
const deferredSwap = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const settled = new Promise<void>((res, rej) => {
    resolve = () => res();
    reject = rej;
  });
  const swap = vi.fn(() => settled);
  return { swap, resolve, reject };
};

/**
 * Runs `fn` inside `act` and lets the swap's `.then` / `.catch` and the state
 * updates they queue run before the assertions.
 */
const actAndSettle = async (fn: () => void) => {
  await act(async () => {
    fn();
    await Promise.resolve();
  });
};

beforeEach(() => {
  enqueueSnackbar.mockClear();
});

describe("useMaintainerRowReorder — which arrows are enabled", () => {
  it("disables up on the first row and down on the last", () => {
    const rows = [row("a", 1), row("b", 2), row("c", 3)];
    const { result } = renderHook(() =>
      useMaintainerRowReorder<TestRow>({
        rows,
        swap: vi.fn().mockResolvedValue(undefined),
        errorMessage: "Error",
      })
    );

    expect(result.current.canMoveUp(rows[0])).toBe(false);
    expect(result.current.canMoveDown(rows[0])).toBe(true);
    expect(result.current.canMoveUp(rows[1])).toBe(true);
    expect(result.current.canMoveDown(rows[1])).toBe(true);
    expect(result.current.canMoveUp(rows[2])).toBe(true);
    expect(result.current.canMoveDown(rows[2])).toBe(false);
  });

  it("reads the sequence from `position`, not from the array order", () => {
    // The form array is not in server order right after a create (the new row
    // is prepended while the server appends it last), so the arrows have to
    // sort by position rather than trust the index.
    const rows = [row("c", 3), row("a", 1), row("b", 2)];
    const { result } = renderHook(() =>
      useMaintainerRowReorder<TestRow>({
        rows,
        swap: vi.fn().mockResolvedValue(undefined),
        errorMessage: "Error",
      })
    );

    expect(result.current.canMoveUp(rows[1])).toBe(false); // "a" is position 1
    expect(result.current.canMoveDown(rows[0])).toBe(false); // "c" is position 3
  });

  it("leaves an uncreated row out of the sequence instead of sorting it to one end", () => {
    // A row with no position is not in the sequence at all: it cannot move, and
    // — the part a refactor is likely to undo — it must not count as the
    // neighbour above the first real row, or that row would look movable and
    // the move would silently do nothing.
    const uncreated = row("temp", null);
    const first = row("a", 1);
    const rows = [uncreated, first, row("b", 2)];
    const { result } = renderHook(() =>
      useMaintainerRowReorder<TestRow>({
        rows,
        swap: vi.fn().mockResolvedValue(undefined),
        errorMessage: "Error",
      })
    );

    expect(result.current.canMoveUp(uncreated)).toBe(false);
    expect(result.current.canMoveDown(uncreated)).toBe(false);
    expect(result.current.canMoveUp(first)).toBe(false);
  });

  it("scopes the sequence to the group, so a row never moves across a boundary", () => {
    // Subcategory positions are unique per category, not across the grid, so
    // the last row of one category has no neighbour below it even though the
    // grid renders another category's rows after it.
    const rows = [
      row("a1", 1, "c1"),
      row("a2", 2, "c1"),
      row("b1", 1, "c2"),
      row("b2", 2, "c2"),
    ];
    const { result } = renderHook(() =>
      useMaintainerRowReorder<TestRow>({
        rows,
        groupBy: byCategory,
        swap: vi.fn().mockResolvedValue(undefined),
        errorMessage: "Error",
      })
    );

    expect(result.current.canMoveDown(rows[1])).toBe(false); // last of c1
    expect(result.current.canMoveUp(rows[2])).toBe(false); // first of c2
  });
});

describe("useMaintainerRowReorder — the move", () => {
  it("swaps with the adjacent row in the same group", async () => {
    const swap = vi.fn().mockResolvedValue(undefined);
    const rows = [row("a1", 1, "c1"), row("a2", 2, "c1"), row("b1", 1, "c2")];
    const { result } = renderHook(() =>
      useMaintainerRowReorder<TestRow>({
        rows,
        groupBy: byCategory,
        swap,
        errorMessage: "Error",
      })
    );

    await actAndSettle(() => result.current.handleMoveDown(rows[0]));

    // "b1" also holds position 2, but in the other group.
    expect(swap).toHaveBeenCalledExactlyOnceWith("a1", "a2");
  });

  it("does nothing when the row has no neighbour in that direction", async () => {
    const swap = vi.fn().mockResolvedValue(undefined);
    const rows = [row("a", 1), row("b", 2)];
    const { result } = renderHook(() =>
      useMaintainerRowReorder<TestRow>({
        rows,
        swap,
        errorMessage: "Error",
      })
    );

    await actAndSettle(() => {
      result.current.handleMoveUp(rows[0]);
      result.current.handleMoveDown(rows[1]);
    });

    expect(swap).not.toHaveBeenCalled();
  });

  it("refuses a second click dispatched before the disabled state renders", async () => {
    // The arrows are disabled off `isSwapping`, but a click already queued
    // reaches the handler before that re-render, and the pre-move positions are
    // still what the rows hold — so the same pair would be sent again and
    // swapped straight back. The ref guard is the only thing covering that gap.
    const { swap, resolve } = deferredSwap();
    const rows = [row("a", 1), row("b", 2)];
    const { result } = renderHook(() =>
      useMaintainerRowReorder<TestRow>({
        rows,
        swap,
        errorMessage: "Error",
      })
    );

    act(() => {
      result.current.handleMoveDown(rows[0]);
      result.current.handleMoveDown(rows[0]);
      result.current.handleMoveDown(rows[0]);
    });

    expect(swap).toHaveBeenCalledExactlyOnceWith("a", "b");

    await actAndSettle(resolve);
  });

  it("surfaces a failed swap and frees the arrows again", async () => {
    const { swap, reject } = deferredSwap();
    const rows = [row("a", 1), row("b", 2)];
    const { result } = renderHook(() =>
      useMaintainerRowReorder<TestRow>({
        rows,
        swap,
        errorMessage: "Error al mover",
      })
    );

    await actAndSettle(() => {
      result.current.handleMoveDown(rows[0]);
      reject(new Error("boom"));
    });

    expect(enqueueSnackbar).toHaveBeenCalledExactlyOnceWith({
      message: "Error al mover",
      variant: "error",
    });
    // Nothing moved, so the rows are still the current sequence: the arrows are
    // trustworthy immediately rather than after a refetch that will not come.
    expect(result.current.isMoveBlocked).toBe(false);

    await actAndSettle(() => result.current.handleMoveDown(rows[0]));
    expect(swap).toHaveBeenCalledTimes(2);
  });
});

describe("useMaintainerRowReorder — isMoveBlocked", () => {
  it("stays on after the swap resolves and clears only once the rows change", async () => {
    // The mutation awaits its own invalidation, so it resolves one commit
    // before the form holds the new order. Releasing the arrows on resolve
    // would hand back a grid whose positions are still the pre-move ones.
    const { swap, resolve } = deferredSwap();
    const initial = [row("a", 1), row("b", 2)];
    const { result, rerender } = renderHook(
      ({ rows }: { rows: TestRow[] }) =>
        useMaintainerRowReorder<TestRow>({
          rows,
          swap,
          errorMessage: "Error",
        }),
      { initialProps: { rows: initial } }
    );

    expect(result.current.isMoveBlocked).toBe(false);

    await actAndSettle(() => {
      result.current.handleMoveDown(initial[0]);
      resolve();
    });

    // Resolved, but the rows are still the ones the move was decided from.
    expect(result.current.isMoveBlocked).toBe(true);

    rerender({ rows: [...initial] });
    expect(result.current.isMoveBlocked).toBe(true);

    // The replayed server order is what releases them.
    rerender({ rows: [row("a", 2), row("b", 1)] });
    expect(result.current.isMoveBlocked).toBe(false);
  });
});
