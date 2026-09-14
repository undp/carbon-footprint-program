import { useCallback, useMemo, useRef, useState } from "react";
import { useSnackbar } from "notistack";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

/**
 * What a reorderable maintainer row has to expose.
 *
 * `position` is null on a row the server has not created yet: it is assigned on
 * create, so such a row has no place in the sequence and cannot be moved or be
 * the neighbour of a move. That is the only test the arrows need — a temporary
 * id is never in the sequence, because it never has a position.
 */
export interface ReorderableRow {
  id: string;
  position: number | null;
}

/** A row that already has a place in its sequence. */
type PositionedRow<TRow extends ReorderableRow> = TRow & { position: number };

interface UseMaintainerRowReorderOptions<TRow extends ReorderableRow> {
  /**
   * The rows as the form holds them right now — `form.watch` output, not a
   * snapshot. The sequence the arrows are enabled from and the sequence a move
   * picks its neighbour from are then one derivation, and both re-derive when
   * the listing refetch is replayed into the form.
   */
  rows: TRow[];
  /**
   * Rows that share one position sequence. Positions are unique inside a
   * sequence, so a move only ever swaps with the adjacent row in it — for
   * subcategories that is the parent category. Left out when the whole grid is
   * a single sequence, as it is for categories.
   */
  groupBy?: (row: TRow) => string;
  /** Server swap. Its invalidation is what repaints the order. */
  swap: (rowId: string, neighborId: string) => Promise<unknown>;
  /** Snackbar fallback when the swap fails. */
  errorMessage: string;
}

/** The whole grid is one sequence when there is nothing to group by. */
const SINGLE_SEQUENCE_KEY = "";

/**
 * Everything a move reads off the rows: which rows are in a sequence and where.
 * A keystroke in an editing row leaves it untouched, the replayed order does
 * not.
 */
const sequenceSignature = (rows: ReorderableRow[]) =>
  rows.map((row) => `${row.id}:${row.position}`).join("|");

/**
 * Move-up / move-down for a maintainer grid whose order lives in `position`.
 *
 * The new order is never painted locally: the swap mutation invalidates the
 * listing and useMaintainerFormSync replays the refetch into the form, so a
 * local reorder would be a second writer for the same rows — and the wrong one
 * whenever the form array is not in server order, which is the case right
 * after a row is created (it is prepended, but the server appends it last).
 *
 * The cost of not painting locally is that the form keeps the pre-move
 * positions until the refetch lands, so every move taken from stale positions
 * has to be refused: a second click on the same arrow would send the same pair
 * again and swap it straight back. `isMoveBlocked` covers that whole window,
 * and callers disable the arrows with it. Being pending is not enough to
 * delimit it: the mutation returns its invalidation, so it resolves once the
 * new order has been *fetched*, one commit before the form holds it. The flag
 * therefore stays on until these rows actually change, which is the frame the
 * arrows can be trusted again. Folding in the listing's own `isFetching`
 * instead would also kill the arrows on refetches that have nothing to do with
 * a reorder (a window refocus, any unrelated maintainer mutation sharing the
 * invalidation token), and the user reads a disabled arrow with no explanation
 * as a broken button.
 */
export const useMaintainerRowReorder = <TRow extends ReorderableRow>({
  rows,
  groupBy,
  swap,
  errorMessage,
}: UseMaintainerRowReorderOptions<TRow>) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isSwapping, setIsSwapping] = useState(false);
  // The arrows are disabled off `isSwapping`, but a second click can still be
  // dispatched before that re-render, so the guard the move itself reads is a
  // ref.
  const isSwappingRef = useRef(false);
  // The sequence the last swap was decided from. It is still what the form
  // holds when the mutation resolves; the replay is what changes it.
  const [preSwapSignature, setPreSwapSignature] = useState<string | null>(null);

  // One pass per render, shared by the blocked flag and by the move that
  // records it.
  const signature = useMemo(() => sequenceSignature(rows), [rows]);

  const groupKeyOf = useCallback(
    (row: TRow) => (groupBy ? groupBy(row) : SINGLE_SEQUENCE_KEY),
    [groupBy]
  );

  // The one derivation of the order: the arrows' enabled state and the
  // neighbour a move swaps with both come from here, so an enabled arrow always
  // matches what the move does.
  //
  // Rows without a position are left out rather than sorted to one end:
  // keeping them in would make the first real row look like it has a neighbour
  // above it, and the move would then silently do nothing.
  const sequences = useMemo(() => {
    const groups = new Map<string, PositionedRow<TRow>[]>();

    for (const row of rows) {
      if (row.position === null) continue;
      const key = groupKeyOf(row);
      // Pushed, not re-spread: `rows` is form.watch output, so this runs on
      // every keystroke in an editing row, and copying each group per member
      // would make that quadratic in the number of rows.
      const siblings = groups.get(key);
      if (siblings) {
        siblings.push(row as PositionedRow<TRow>);
      } else {
        groups.set(key, [row as PositionedRow<TRow>]);
      }
    }

    for (const siblings of groups.values()) {
      siblings.sort((a, b) => a.position - b.position);
    }

    return groups;
  }, [rows, groupKeyOf]);

  const findNeighbor = useCallback(
    (row: TRow, direction: "up" | "down"): PositionedRow<TRow> | undefined => {
      if (row.position === null) return undefined;

      const siblings = sequences.get(groupKeyOf(row)) ?? [];
      const index = siblings.findIndex((sibling) => sibling.id === row.id);
      if (index === -1) return undefined;

      return siblings[direction === "up" ? index - 1 : index + 1];
    },
    [sequences, groupKeyOf]
  );

  const canMoveUp = useCallback(
    (row: TRow) => findNeighbor(row, "up") !== undefined,
    [findNeighbor]
  );

  const canMoveDown = useCallback(
    (row: TRow) => findNeighbor(row, "down") !== undefined,
    [findNeighbor]
  );

  const handleMove = useCallback(
    async (row: TRow, direction: "up" | "down") => {
      if (isSwappingRef.current) return;

      const neighbor = findNeighbor(row, direction);
      if (!neighbor) return;

      isSwappingRef.current = true;
      setIsSwapping(true);
      setPreSwapSignature(signature);
      try {
        await swap(row.id, neighbor.id);
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, errorMessage),
          variant: "error",
        });
        // Nothing moved, so the sequence in the form is the current one and the
        // arrows can be trusted immediately.
        setPreSwapSignature(null);
      } finally {
        isSwappingRef.current = false;
        setIsSwapping(false);
      }
    },
    [signature, findNeighbor, swap, errorMessage, enqueueSnackbar]
  );

  const handleMoveUp = useCallback(
    (row: TRow) => void handleMove(row, "up"),
    [handleMove]
  );

  const handleMoveDown = useCallback(
    (row: TRow) => void handleMove(row, "down"),
    [handleMove]
  );

  return {
    handleMoveUp,
    handleMoveDown,
    canMoveUp,
    canMoveDown,
    isMoveBlocked: isSwapping || preSwapSignature === signature,
  };
};
