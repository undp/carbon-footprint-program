import { FC, useMemo, memo } from "react";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Add } from "@mui/icons-material";
import { SectionCard } from "./SectionCard";
import { OrganizationUserActionsCell } from "./OrganizationUserActionsCell";
import { StylizedDataGrid } from "@/components/StylizedDataGrid";
import { ORGANIZATION_ROLE_LABELS } from "@/labels/status/role";
import { OrganizationRole } from "@repo/types";

type User = {
  userId: string;
  name: string;
  email: string | null;
  organizationRole: OrganizationRole;
  isCurrentUser: boolean;
};

type OrganizationUsersTableProps = {
  users: User[];
  onAdd: () => void;
  onEdit: (userId: string, userEmail: string, role: OrganizationRole) => void;
  onDelete: (userId: string, userEmail: string) => void;
  isLoading?: boolean;
  canManageUsers: boolean;
};

const OrganizationUsersTableComponent: FC<OrganizationUsersTableProps> = ({
  users,
  onAdd,
  onEdit,
  onDelete,
  isLoading = false,
  canManageUsers,
}) => {
  const columns: GridColDef<User>[] = useMemo(
    () => [
      // Temporarily hiding name column until we capture them
      // {
      //   field: "name",
      //   headerName: "Nombre",
      //   minWidth: 250,
      //   flex: 1,
      //   cellClassName: "content-center",
      //   valueFormatter: (value: string) => value || "-",
      // },
      {
        field: "email",
        headerName: "Correo electrónico",
        minWidth: 280,
        flex: 1,
        cellClassName: "content-center",
      },
      {
        field: "organizationRole",
        headerName: "Rol",
        minWidth: 150,
        flex: 0.5,
        cellClassName: "content-center",
        valueFormatter: (value: OrganizationRole) =>
          ORGANIZATION_ROLE_LABELS[value],
      },
      ...(canManageUsers
        ? [
            {
              field: "actions",
              headerName: "Acciones",
              headerAlign: "center" as const,
              align: "center" as const,
              minWidth: 120,
              flex: 0.5,
              sortable: false,
              cellClassName: "content-center",
              renderCell: (params: GridRenderCellParams<User>) => (
                <OrganizationUserActionsCell
                  userId={params.row.userId}
                  userEmail={params.row.email}
                  currentRole={params.row.organizationRole}
                  isCurrentUser={params.row.isCurrentUser}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ),
            },
          ]
        : []),
    ],
    [canManageUsers, onEdit, onDelete]
  );

  return (
    <SectionCard
      title="Usuarios"
      action={
        canManageUsers
          ? {
              label: "AGREGAR USUARIO",
              icon: <Add />,
              onClick: onAdd,
            }
          : undefined
      }
    >
      <StylizedDataGrid
        autoHeight
        columnHeaderHeight={40}
        rows={users}
        columns={columns}
        loading={isLoading}
        getRowId={(row: User) => row.userId}
        localeText={{
          noRowsLabel: "No hay usuarios registrados",
        }}
        sx={(theme) => ({
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: theme.palette.background.default,
            padding: "10px 8px",
          },
          "& .MuiDataGrid-cell": {
            padding: "10px 8px",
          },
        })}
      />
    </SectionCard>
  );
};

export const OrganizationUsersTable = memo(OrganizationUsersTableComponent);
