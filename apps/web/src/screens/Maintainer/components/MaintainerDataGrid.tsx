import { SxProps, Theme } from "@mui/material";
import { StylizedDataGrid, type StylizedDataGridProps } from "@components";

interface MaintainerDataGridProps extends Omit<StylizedDataGridProps, "sx"> {
  editingRowId: string | null;
  cellMaxHeight?: number;
  sx?: SxProps<Theme>;
}

export const MaintainerDataGrid = ({
  editingRowId,
  cellMaxHeight = 100,
  sx,
  getRowClassName,
  ...props
}: MaintainerDataGridProps) => (
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
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
    getRowClassName={
      getRowClassName ??
      (({ id }) => (String(id) === editingRowId ? "row--editing" : ""))
    }
    {...props}
  />
);
