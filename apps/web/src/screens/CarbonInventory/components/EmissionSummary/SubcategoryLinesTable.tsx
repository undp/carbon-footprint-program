import { FC, useMemo } from "react";
import { Box, Typography, alpha } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GetEmissionsDetailedSummaryResponse } from "@repo/types";
import { getColorPalette } from "@/utils/categoryColors";
import { EmissionPercentageBadge } from "@/components/EmissionResults";
import { INCOMPLETE_SOURCES_TOOLTIP } from "../../constants";
import { useSubcategoryLinesColumns } from "./useSubcategoryLinesColumns";

interface SubcategoryLinesTableProps {
  subcategory: GetEmissionsDetailedSummaryResponse["categories"][number]["subcategories"][number];
  categoryColor: string;
}

export const SubcategoryLinesTable: FC<SubcategoryLinesTableProps> = ({
  subcategory,
  categoryColor,
}) => {
  const categoryColorPalette = getColorPalette(categoryColor);
  const columns = useSubcategoryLinesColumns();
  const rows = useMemo(
    () => subcategory.lines.map((line) => ({ ...line, id: line.lineId })),
    [subcategory.lines]
  );

  return (
    <Box className="flex flex-col gap-2">
      <Typography
        variant="body2"
        fontWeight="600"
        sx={{ color: categoryColorPalette.dark }}
      >
        {subcategory.name}
      </Typography>

      <Box className="flex w-full items-center justify-between gap-2">
        {/* TODO: use StyledDataGrid once Chelo's branch is merged */}
        <DataGrid
          rows={rows}
          columns={columns}
          columnHeaderHeight={24}
          getRowHeight={() => "auto"}
          hideFooter
          disableColumnResize
          disableColumnSorting
          disableColumnMenu
          disableColumnFilter
          disableColumnSelector
          disableRowSelectionOnClick
          checkboxSelection={false}
          localeText={{ noRowsLabel: "Sin líneas de emisión" }}
          sx={{
            flex: 1,
            maxWidth: "75%",
            borderRadius: "8px",
            border: `1px solid ${alpha(categoryColorPalette.main, 0.2)}`,
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: categoryColorPalette.light,
              color: categoryColorPalette.dark,
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
              color: categoryColorPalette.dark,
              borderBottom: `1px solid ${alpha(categoryColorPalette.main, 0.2)}`,
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
          }}
        />

        <EmissionPercentageBadge
          emissions={subcategory.subtotal}
          percentage={subcategory.percentage}
          categoryColor={categoryColor}
          incompleteTooltip={
            subcategory.hasIncompleteLines
              ? INCOMPLETE_SOURCES_TOOLTIP
              : undefined
          }
        />
      </Box>
    </Box>
  );
};
