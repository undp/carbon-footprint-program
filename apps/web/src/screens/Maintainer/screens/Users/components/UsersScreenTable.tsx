import { FC, useMemo } from "react";
import type { IFuseOptions } from "fuse.js";
import type { GridColDef } from "@mui/x-data-grid";
import type { GetAllUsersResponse } from "@repo/types";
import { MaintainerDataGrid } from "../../../components/MaintainerDataGrid";
import { SYSTEM_ROLE_LABELS } from "@/labels/status/role";
import { formatter } from "@/utils/formatting";
import Box from "@mui/material/Box";

type UserRow = GetAllUsersResponse[number];

interface UsersScreenTableProps {
  rows: GetAllUsersResponse;
  columns: GridColDef[];
  isLoading?: boolean;
}

export const UsersScreenTable: FC<UsersScreenTableProps> = ({
  rows,
  columns,
  isLoading,
}) => {
  const fuseOptions = useMemo<IFuseOptions<UserRow>>(
    () => ({
      keys: [
        "email",
        { name: "role", getFn: (row) => SYSTEM_ROLE_LABELS[row.role].label },
        {
          name: "organizations",
          getFn: (row) =>
            row.organizations
              .map(({ organizationName }) => organizationName)
              .join(" "),
        },
        {
          name: "createdAt",
          getFn: (row) => formatter.dateLong(row.createdAt, { ifEmpty: "" }),
        },
        {
          name: "lastAccessAt",
          getFn: (row) => formatter.dateLong(row.lastAccessAt, { ifEmpty: "" }),
        },
      ],
      threshold: 0.3,
    }),
    []
  );

  return (
    <Box className="flex w-full rounded-sm bg-white p-3">
      <MaintainerDataGrid<UserRow>
        editingRowId={null}
        searchable={{
          fuseOptions,
          placeholder: "Buscar usuario...",
          downloadFileName: "usuarios",
        }}
        loading={isLoading}
        disableColumnMenu={false}
        disableColumnFilter={false}
        showToolbar
        columns={columns}
        rows={rows}
        getRowHeight={() => "auto"}
        getRowId={(row: UserRow) => row.id}
        disableColumnSorting={false}
        hideFooter={false}
        pagination
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
      />
    </Box>
  );
};
