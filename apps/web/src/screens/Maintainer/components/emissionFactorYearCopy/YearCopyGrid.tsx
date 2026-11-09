import { FC } from "react";
import { Box } from "@mui/material";
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
 * `-1` is MUI X's documented "all results" page size, the one value the MIT
 * grid accepts above its 100-row cap (pagination itself cannot be turned off
 * there). The pager stays visible, so pages of 100 remain if a release ever
 * stops honouring it; the screen test with more than 100 factors catches that.
 */
const ALL_ROWS = -1;

/**
 * Every source-year factor in one grid, on one page by default. Rows are keyed
 * by source factor id, so sorting, filtering or paging never lands an edit on
 * another row.
 *
 * The bounded height is what keeps it fast: inside it the grid virtualizes and
 * mounts only the rows in view. Without it the grid grows to its content and
 * mounts every row with its two inputs.
 */
export const YearCopyGrid: FC<Props> = ({
  rows,
  columns,
  filterModel,
  onFilterModelChange,
}) => (
  <Box sx={{ height: "70vh", minHeight: 480, width: "100%" }}>
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
      pageSizeOptions={[25, 50, 100, { value: ALL_ROWS, label: "Todos" }]}
      initialState={{ pagination: { paginationModel: { pageSize: ALL_ROWS } } }}
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
  </Box>
);
