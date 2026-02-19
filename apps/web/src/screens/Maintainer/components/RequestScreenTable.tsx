import { FC } from "react";
import { Box } from "@mui/material";
import { StylizedDataGrid } from "@components";
import { useRequestColumns, type RequestRow } from "../hooks/useRequestColumns";
import { useAdminRequests } from "@/api/query/requests/useAdminRequests";

export const RequestScreenTable: FC = () => {
  const { data: requests = [] } = useAdminRequests();
  const columns = useRequestColumns();

  return (
    <Box>
      <StylizedDataGrid
        sx={(theme) => ({
          backgroundColor: "white",
          border: "none",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
          "& .MuiDataGrid-main": {
            padding: "16px !important",
          },
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: theme.palette.background.default,
          },
          "& .MuiDataGrid-cell": {
            minHeight: "65px",
            padding: "10px",
          },
        })}
        columns={columns}
        rows={requests}
        rowHeight={52}
        getRowId={(row: RequestRow) => row.id}
      />
    </Box>
  );
};
