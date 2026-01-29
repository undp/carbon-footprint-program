import { FC } from "react";
import { Box } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { StylizedDataGrid } from "@/components";
import { Methodology } from "../types";

interface MethodologyEditorGridProps {
  columns: GridColDef<Methodology>[];
  rows: Methodology[];
  processRowUpdate: (newRow: Methodology) => Methodology;
  loading?: boolean;
}

export const MethodologyEditorGrid: FC<MethodologyEditorGridProps> = ({
  columns,
  rows,
  loading = false,
}) => (
  <Box className="flex w-full">
    <StylizedDataGrid
      sx={(theme) => ({
        "& .MuiDataGrid-columnHeader": {
          backgroundColor: theme.palette.grey[200],
        },
      })}
      columns={columns}
      rows={rows}
      getRowId={(row: Methodology) => row.id}
      loading={loading}
    />
  </Box>
);
