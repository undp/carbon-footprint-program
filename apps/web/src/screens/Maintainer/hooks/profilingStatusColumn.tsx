import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { StatusChip } from "@/components/StatusChip";
import {
  PROFILING_STATUS_CONFIG,
  resolveProfilingStatusKey,
} from "@/labels/chips/profiling";

/**
 * Shared "Estado" column for the profiling maintainer grids (sector, subsector,
 * main activity, organization size). Pass `overrides` for grid-specific flags
 * such as disabling sort/filter.
 */
export const profilingStatusColumn = <T extends { status: string | null }>(
  overrides?: Partial<GridColDef<T>>
): GridColDef<T> => ({
  field: "status",
  headerName: "Estado",
  width: 130,
  valueGetter: (_value, row: T) =>
    PROFILING_STATUS_CONFIG[resolveProfilingStatusKey(row.status)].label,
  renderCell: ({ row }: GridRenderCellParams<T>) => (
    <StatusChip
      config={PROFILING_STATUS_CONFIG[resolveProfilingStatusKey(row.status)]}
    />
  ),
  ...overrides,
});
