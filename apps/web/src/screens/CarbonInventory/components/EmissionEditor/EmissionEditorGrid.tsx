import { FC, useMemo } from "react";
import { Box } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { StylizedDataGrid } from "@/components";
import { EmissionCaptureFormLine } from "../../types/EmissionCaptureTypes";
import { getColorPalette } from "@/utils/categoryColors";

interface EmissionEditorGridProps {
  columns: GridColDef<EmissionCaptureFormLine>[];
  rows: EmissionCaptureFormLine[];
  categoryColor: string;
  loading?: boolean;
}

export const EmissionEditorGrid: FC<EmissionEditorGridProps> = ({
  columns,
  rows,
  categoryColor,
  loading = false,
}) => {
  const categoryColorPalette = useMemo(
    () => getColorPalette(categoryColor),
    [categoryColor]
  );

  return (
    <Box
      style={{
        display: "flex",
        width: "100%",
      }}
    >
      <StylizedDataGrid
        sx={{
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: categoryColorPalette.light,
            color: categoryColorPalette.dark,
          },
        }}
        columnHeaderHeight={48}
        columns={columns}
        rows={rows}
        getRowId={(row: EmissionCaptureFormLine) => row.lineId}
        loading={loading}
        localeText={{ noRowsLabel: "Sin fuentes" }}
      />
    </Box>
  );
};
