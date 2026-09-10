import { useCallback } from "react";
import { useSnackbar } from "notistack";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

/** What a reorderable maintainer row has to expose. */
export interface ReorderableRow {
  id: string;
  position: number;
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

  const handleMove = useCallback(
    async (row: TRow, direction: "up" | "down") => {
      // A row that is not on the server yet has no position to swap.
      if (isNewRow(row.id)) return;

      const rows = form.getValues(fieldName) as TRow[];
      const groupKey = groupBy?.(row);
      const siblings = (
        groupBy
          ? rows.filter((candidate) => groupBy(candidate) === groupKey)
          : [...rows]
      ).sort((a, b) => a.position - b.position);

      const index = siblings.findIndex((sibling) => sibling.id === row.id);
      if (index === -1) return;
      if (direction === "up" && index === 0) return;
      if (direction === "down" && index >= siblings.length - 1) return;

      const neighbor = siblings[direction === "up" ? index - 1 : index + 1];
      if (!neighbor || isNewRow(neighbor.id)) return;

      try {
        await swap(row.id, neighbor.id);
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, errorMessage),
          variant: "error",
        });
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

  return { handleMoveUp, handleMoveDown };
};
