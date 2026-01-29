import { Box } from "@mui/material";
import { type DataGridProps } from "@mui/x-data-grid";
import { FC } from "react";
import { StylizedDataGrid } from "@/components";

type Props = Omit<DataGridProps, "sx"> & {
  minHeight?: number;
  sx?: DataGridProps["sx"];
};

export const DataGridWrapper: FC<Props> = ({
  minHeight = 400,
  sx,
  ...props
}) => (
  <Box sx={{ width: "100%", minHeight }}>
    <StylizedDataGrid
      editMode="cell"
      sx={{
        backgroundColor: "#fff",
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
