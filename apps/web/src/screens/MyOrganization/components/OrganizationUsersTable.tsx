import { FC, useMemo, memo } from "react";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Add } from "@mui/icons-material";
import { SectionCard } from "./SectionCard";
import { OrganizationUserActionsCell } from "./OrganizationUserActionsCell";
import { StylizedDataGrid } from "@/components/StylizedDataGrid";
import { ROLE_LABELS } from "../constants";
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
  onEdit: (userId: string, userName: string, role: OrganizationRole) => void;
  onDelete: (userId: string, userName: string) => void;
  isLoading?: boolean;
};

const OrganizationUsersTableComponent: FC<OrganizationUsersTableProps> = ({
  users,
  onAdd,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  const columns: GridColDef<User>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Nombre",
        minWidth: 250,
        flex: 1,
        cellClassName: "content-center",
      },
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
        valueFormatter: (value: OrganizationRole) => ROLE_LABELS[value],
      },
      {
        field: "actions",
        headerName: "Acciones",
        headerAlign: "center",
        align: "center",
        minWidth: 120,
        flex: 0.5,
        sortable: false,
        cellClassName: "content-center",
        renderCell: (params: GridRenderCellParams<User>) => (
          <OrganizationUserActionsCell
            userId={params.row.userId}
            userName={params.row.name}
            currentRole={params.row.organizationRole}
            isCurrentUser={params.row.isCurrentUser}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
      },
    ],
    [onEdit, onDelete]
  );

  return (
    <SectionCard
      title="Usuarios"
      action={{
        label: "AGREGAR USUARIO",
        icon: <Add />,
        onClick: onAdd,
      }}
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
