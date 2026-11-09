import { FC } from "react";
import type { GridColDef, GridFilterModel } from "@mui/x-data-grid";
import { alpha } from "@mui/material/styles";
import { YearCopyOutcome } from "@repo/utils";
import { StylizedDataGrid } from "@/components/StylizedDataGrid";
import type { YearCopyRow } from "../../utils/emissionFactorYearCopy";

interface Props {
  rows: YearCopyRow[];
  columns: GridColDef<YearCopyRow>[];
  filterModel: GridFilterModel;
  onFilterModelChange: (model: GridFilterModel) => void;
}

const rowClassName = (row: YearCopyRow): string => {
  if (row.outcome === YearCopyOutcome.EXISTS_IN_TARGET) return "row--existing";
  if (row.outcome === YearCopyOutcome.EXCLUDED) return "row--excluded";
  return row.valueChanged ? "row--edited" : "";
};

/**
 * Every source-year factor in one grid. Rows are keyed by source factor id, so
 * sorting, filtering or paging never lands an edit on another row.
 */
export const YearCopyGrid: FC<Props> = ({
  rows,
  columns,
  filterModel,
  onFilterModelChange,
}) => (
  <StylizedDataGrid
    rows={rows}
    columns={columns}
    getRowId={(row: YearCopyRow) => row.id}
    getRowClassName={({ row }) => rowClassName(row as YearCopyRow)}
    getRowHeight={() => null}
    rowHeight={56}
    showToolbar
    slotProps={{
      toolbar: {
        csvOptions: { disableToolbarButton: true },
        printOptions: { disableToolbarButton: true },
      },
    }}
    disableColumnSorting={false}
    disableColumnFilter={false}
    disableColumnMenu={false}
    disableColumnSelector={false}
    filterModel={filterModel}
    onFilterModelChange={onFilterModelChange}
    hideFooter={false}
    pageSizeOptions={[25, 50, 100]}
    initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
    sx={(theme) => ({
      width: "100%",
      "& .MuiDataGrid-columnHeaders": { backgroundColor: "grey.100" },
      "& .row--edited": {
        backgroundColor: alpha(theme.palette.primary.main, 0.06),
        boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}`,
      },
      "& .row--edited:hover": {
        backgroundColor: alpha(theme.palette.primary.main, 0.06),
      },
      "& .row--existing": { backgroundColor: "grey.50" },
    })}
  />
);
