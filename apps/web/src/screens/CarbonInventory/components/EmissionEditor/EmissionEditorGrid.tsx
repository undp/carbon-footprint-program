import { FC } from "react";
import { Box, darken } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { EmissionCaptureFormLine } from "../../types/EmissionCaptureTypes";

interface EmissionEditorGridProps {
  columns: GridColDef<EmissionCaptureFormLine>[];
  rows: EmissionCaptureFormLine[];
  categoryPosition: number;
}

export const EmissionEditorGrid: FC<EmissionEditorGridProps> = ({
  columns,
  rows,
  categoryPosition,
}) => (
  <Box
    style={{
      display: "flex",
      width: "100%",
    }}
  >
    <DataGrid
      sx={(theme) => ({
        borderRadius: "8px",
        "& .MuiDataGrid-columnHeader": {
          padding: "10px 8px",
          backgroundColor: theme.palette.category[categoryPosition].light,
          color: darken(theme.palette.category[categoryPosition].main, 0.6),
        },
        "& .MuiDataGrid-columnHeader:focus": {
          outline: "none",
        },
        "& .MuiDataGrid-columnHeader:focus-within": {
          outline: "none",
        },
        "& .MuiDataGrid-columnSeparator": {
          display: "none",
        },
        "& .MuiDataGrid-cell": {
          padding: "10px 8px",
        },
        "& .MuiDataGrid-cell:focus": {
          outline: "none",
        },
        "& .MuiDataGrid-cell:focus-within": {
          outline: "none",
        },
        "& .MuiDataGrid-row:hover": {
          backgroundColor: "transparent",
        },
        "--DataGrid-overlayHeight": "56px",
      })}
      hideFooter
      columns={columns}
      getRowHeight={() => "auto"}
      rows={rows}
      getRowId={(row) => row.lineId}
      disableColumnResize
      disableColumnSorting
      disableColumnMenu
      disableColumnFilter
      disableColumnSelector
      disableRowSelectionOnClick
      checkboxSelection={false}
    />
  </Box>
);
