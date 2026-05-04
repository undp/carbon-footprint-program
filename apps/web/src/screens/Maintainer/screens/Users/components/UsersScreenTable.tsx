import { FC } from "react";
import { StylizedDataGrid } from "@components";
import type { GetAllUsersResponse } from "@repo/types";
import type { GridColDef } from "@mui/x-data-grid";

interface UsersScreenTableProps {
  rows: GetAllUsersResponse;
  columns: GridColDef[];
  isLoading?: boolean;
}

export const UsersScreenTable: FC<UsersScreenTableProps> = ({
  rows,
  columns,
  isLoading,
}) => (
  <StylizedDataGrid
    sx={(theme) => ({
      backgroundColor: "background.paper",
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
    loading={isLoading}
    disableColumnMenu={false}
    disableColumnFilter={false}
    showToolbar
    columns={columns}
    rows={rows}
    getRowHeight={() => "auto"}
    getRowId={(row: GetAllUsersResponse[number]) => row.id}
    disableColumnSorting={false}
    hideFooter={false}
    pagination
    pageSizeOptions={[10, 25, 50, 100]}
    initialState={{
      pagination: { paginationModel: { pageSize: 10 } },
    }}
  />
);
