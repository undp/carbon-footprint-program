import { useMemo, useState } from "react";
import { SxProps, Theme } from "@mui/material";
import type { IFuseOptions } from "fuse.js";
import type {
  GridColDef,
  GridSlotProps,
  GridSlotsComponent,
  GridValidRowModel,
} from "@mui/x-data-grid";
import { StylizedDataGrid, type StylizedDataGridProps } from "@components";
import { useFuzzySearch } from "@/hooks";
import { pinEditingRowColumn } from "@/utils/dataGridPinEditingRow";
import { MaintainerToolbar } from "./MaintainerToolbar";

export interface MaintainerDataGridSearchable<T extends GridValidRowModel> {
  fuseOptions: IFuseOptions<T>;
  placeholder?: string;
  downloadFileName?: string;
}

interface MaintainerDataGridProps<
  T extends GridValidRowModel = GridValidRowModel,
> extends StylizedDataGridProps {
  editingRowId: string | null;
  cellMaxHeight?: number;
  searchable?: MaintainerDataGridSearchable<T>;
}

type SxArrayItem = Extract<SxProps<Theme>, readonly unknown[]>[number];

const isSxArray = (
  value: SxProps<Theme> | undefined
): value is Extract<SxProps<Theme>, readonly unknown[]> => Array.isArray(value);

export const MaintainerDataGrid = <
  T extends GridValidRowModel = GridValidRowModel,
>({
  editingRowId,
  cellMaxHeight = 100,
  sx,
  getRowClassName,
  rows,
  columns,
  searchable,
  slots,
  slotProps,
  ...props
}: MaintainerDataGridProps<T>) => {
  const [searchQuery, setSearchQuery] = useState("");

  const rowsArray = useMemo<T[]>(
    () => (rows ? Array.from(rows as readonly T[]) : []),
    [rows]
  );

  const { results } = useFuzzySearch<T>(rowsArray, {
    query: searchable ? searchQuery : undefined,
    fuseOptions: searchable?.fuseOptions,
  });

  const displayRows = useMemo<T[]>(() => {
    if (!searchable || searchQuery.trim() === "") return rowsArray;
    if (editingRowId === null) return results;

    const editingRowInResults = results.some(
      (row) => String((row as unknown as { id: unknown }).id) === editingRowId
    );
    if (editingRowInResults) return results;

    const editingRow = rowsArray.find(
      (row) => String((row as unknown as { id: unknown }).id) === editingRowId
    );
    return editingRow ? [editingRow, ...results] : results;
  }, [searchable, searchQuery, rowsArray, results, editingRowId]);

  const wrappedColumns = useMemo(() => {
    if (editingRowId === null || !columns) return columns;
    return (columns as readonly GridColDef<GridValidRowModel>[]).map((col) =>
      pinEditingRowColumn(col, editingRowId)
    );
  }, [columns, editingRowId]);

  const mergedSlots: Partial<GridSlotsComponent> | undefined = useMemo(
    () =>
      searchable
        ? {
            ...slots,
            toolbar:
              MaintainerToolbar as unknown as GridSlotsComponent["toolbar"],
          }
        : slots,
    [searchable, slots]
  );

  const mergedSlotProps = useMemo(() => {
    if (!searchable)
      return {
        ...slotProps,
        toolbar: {
          ...slotProps?.toolbar,
          showQuickFilter: false,
        },
      };
    return {
      ...slotProps,
      toolbar: {
        searchValue: searchQuery,
        onSearchChange: setSearchQuery,
        searchPlaceholder: searchable.placeholder,
        fileName: searchable.downloadFileName,
      } as unknown as GridSlotProps["toolbar"],
    };
  }, [searchable, slotProps, searchQuery]);

  const sxArray: SxArrayItem[] = isSxArray(sx)
    ? [...sx]
    : sx
      ? [sx as SxArrayItem]
      : [];

  return (
    <StylizedDataGrid
      sx={[
        (theme: Theme) => ({
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: theme.palette.grey[200],
          },
          "& .MuiDataGrid-cell": {
            display: "flex",
            maxHeight: cellMaxHeight,
            alignItems: "center",
          },
          "& .MuiDataGrid-cell .MuiOutlinedInput-root": {
            backgroundColor: theme.palette.common.white,
          },
          "& .MuiDataGrid-cell .MuiSelect-select": {
            backgroundColor: theme.palette.common.white,
          },
          "& .MuiDataGrid-row.row--editing": {
            backgroundColor: theme.palette.grey[100],
          },
        }),
        ...sxArray,
      ]}
      getRowClassName={
        getRowClassName ??
        (({ id }) => (String(id) === editingRowId ? "row--editing" : ""))
      }
      rows={displayRows}
      columns={wrappedColumns ?? columns}
      slots={mergedSlots}
      slotProps={mergedSlotProps}
      {...props}
    />
  );
};
