import { FC, useMemo } from "react";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Add } from "@mui/icons-material";
import { SectionCard } from "./SectionCard";
import { OrganizationUserActionsCell } from "./OrganizationUserActionsCell";
import { StylizedDataGrid } from "@/components/StylizedDataGrid";

type User = {
  userId: string;
  name: string;
  email: string;
  organizationRole: string;
  isCurrentUser: boolean;
};

type OrganizationUsersTableProps = {
  users: User[];
  onAdd: () => void;
  onEdit: (userId: string, userName: string, role: string) => void;
  onDelete: (userId: string, userName: string) => void;
  isLoading?: boolean;
};

// Map role enum values to Spanish labels
const ROLE_LABELS: Record<string, string> = {
  VIEWER: "Lector",
  ORGANIZATION_CONTRIBUTOR: "Editor",
  ORGANIZATION_ADMIN: "Admin",
  EXTERNAL_VERIFIER: "Verificador Externo",
  EXTERNAL_CONSULTANT: "Consultor Externo",
};

export const OrganizationUsersTable: FC<OrganizationUsersTableProps> = ({
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
        valueFormatter: (value: string) => ROLE_LABELS[value] || value,
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
        getRowId={(row) => row.userId}
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
