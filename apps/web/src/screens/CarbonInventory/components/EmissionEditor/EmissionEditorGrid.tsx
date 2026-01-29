import { FC } from "react";
import { Box, darken } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { StylizedDataGrid } from "@/components";
import { EmissionCaptureFormLine } from "../../types/EmissionCaptureTypes";

interface EmissionEditorGridProps {
  columns: GridColDef<EmissionCaptureFormLine>[];
  rows: EmissionCaptureFormLine[];
  categoryPosition: number;
  loading?: boolean;
}

export const EmissionEditorGrid: FC<EmissionEditorGridProps> = ({
  columns,
  rows,
  categoryPosition,
  loading = false,
}) => (
  <Box
    style={{
      display: "flex",
      width: "100%",
    }}
  >
    <StylizedDataGrid
      sx={(theme) => ({
        "& .MuiDataGrid-columnHeader": {
          backgroundColor: theme.palette.category[categoryPosition].light,
          color: darken(theme.palette.category[categoryPosition].main, 0.6),
        },
      })}
      columns={columns}
      rows={rows}
      getRowId={(row: EmissionCaptureFormLine) => row.lineId}
      loading={loading}
    />
  </Box>
);
