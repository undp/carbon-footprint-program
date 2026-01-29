import { FC } from "react";
import { Box } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { StylizedDataGrid } from "@/components";
import { Methodology } from "../types";

interface MethodologyEditorGridProps {
  columns: GridColDef<Methodology>[];
  rows: Methodology[];
  processRowUpdate: (newRow: Methodology) => Methodology;
  loading?: boolean;
  editingRowId?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiRef?: any;
}

export const MethodologyEditorGrid: FC<MethodologyEditorGridProps> = ({
  columns,
  rows,
  processRowUpdate,
  loading = false,
  editingRowId = null,
  apiRef,
}) => (
  <Box className="flex w-full">
    <StylizedDataGrid
      sx={(theme) => ({
        "& .MuiDataGrid-columnHeader": {
          backgroundColor: theme.palette.grey[200],
        },
      })}
      editMode="row"
      apiRef={apiRef}
      columns={columns}
      rows={rows}
      getRowId={(row: Methodology) => row.id}
      loading={loading}
      processRowUpdate={processRowUpdate}
      isCellEditable={(params) => params.id === editingRowId}
    />
  </Box>
);
