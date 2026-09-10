import { useCallback, useRef, useState } from "react";
import { useSnackbar } from "notistack";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

/**
 * What a reorderable maintainer row has to expose.
 *
 * `position` is null on a row the server has not created yet: it is assigned on
 * create, so such a row has no place in the sequence and cannot be moved or be
 * the neighbour of a move.
 */
export interface ReorderableRow {
  id: string;
  position: number | null;
}

interface UseMaintainerRowReorderOptions<
  TFormValues extends FieldValues,
  TRow extends ReorderableRow,
> {
  form: UseFormReturn<TFormValues>;
  fieldName: Path<TFormValues>;
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

const isNewRow = (rowId: string) => rowId.startsWith("temp_");

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
 * and callers disable the arrows with it. It spans the refetch too because the
 * swap mutation returns its invalidation, so `swap` stays pending until the new
 * order has been fetched — which is why the flag can be read off this hook
 * alone. Folding in the listing's own `isFetching` would also kill the arrows
 * on refetches that have nothing to do with a reorder (a window refocus, any
 * unrelated maintainer mutation sharing the invalidation token), and the user
 * reads a disabled arrow with no explanation as a broken button.
 */
export const useMaintainerRowReorder = <
  TFormValues extends FieldValues,
  TRow extends ReorderableRow,
>({
  form,
  fieldName,
  groupBy,
  swap,
  errorMessage,
}: UseMaintainerRowReorderOptions<TFormValues, TRow>) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isSwapping, setIsSwapping] = useState(false);
  // The arrows are disabled off `isSwapping`, but a second click can still be
  // dispatched before that re-render, so the guard the move itself reads is a
  // ref.
  const isSwappingRef = useRef(false);

  const handleMove = useCallback(
    async (row: TRow, direction: "up" | "down") => {
      // A row that is not on the server yet has no position to swap.
      if (isNewRow(row.id)) return;
      if (isSwappingRef.current) return;

      const rows = form.getValues(fieldName) as TRow[];
      const groupKey = groupBy?.(row);
      // Rows without a position are not in the sequence yet, so they are left
      // out rather than sorted to one end: keeping them in would make the
      // first real row look like it has a neighbour above it, and the move
      // would then silently do nothing.
      const siblings = rows
        .filter(
          (candidate): candidate is TRow & { position: number } =>
            candidate.position !== null &&
            (!groupBy || groupBy(candidate) === groupKey)
        )
        .sort((a, b) => a.position - b.position);

      const index = siblings.findIndex((sibling) => sibling.id === row.id);
      if (index === -1) return;
      if (direction === "up" && index === 0) return;
      if (direction === "down" && index >= siblings.length - 1) return;

      const neighbor = siblings[direction === "up" ? index - 1 : index + 1];
      if (!neighbor || isNewRow(neighbor.id)) return;

      isSwappingRef.current = true;
      setIsSwapping(true);
      try {
        await swap(row.id, neighbor.id);
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, errorMessage),
          variant: "error",
        });
      } finally {
        isSwappingRef.current = false;
        setIsSwapping(false);
      }
    },
    [form, fieldName, groupBy, swap, errorMessage, enqueueSnackbar]
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
    isMoveBlocked: isSwapping,
  };
};
