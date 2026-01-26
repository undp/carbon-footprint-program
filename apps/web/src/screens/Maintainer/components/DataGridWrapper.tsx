import { Box } from "@mui/material";
import { DataGrid, type DataGridProps } from "@mui/x-data-grid";
import { FC } from "react";

type Props = DataGridProps & {
  minHeight?: number;
};

export const DataGridWrapper: FC<Props> = ({
  minHeight = 400,
  sx,
  ...props
}) => (
  <Box sx={{ width: "100%", minHeight }}>
    <DataGrid
      editMode="cell"
      disableRowSelectionOnClick
      hideFooterPagination
      getRowHeight={() => "auto"}
      sx={{
        backgroundColor: "#fff",
        borderRadius: 2,
        "& .MuiDataGrid-cell": {
          py: 1.5,
          display: "flex",
          alignItems: "center",
        },
        "& .MuiDataGrid-columnHeaders": {
          backgroundColor: "#f9fafb",
        },
        "& .MuiDataGrid-columnHeaderTitle": {
          fontWeight: 700,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          color: "#414046",
        },
        ...sx,
      }}
      {...props}
    />
  </Box>
);
