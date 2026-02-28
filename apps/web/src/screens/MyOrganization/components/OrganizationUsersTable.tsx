import { FC, useMemo } from "react";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Add } from "@mui/icons-material";
import { SectionCard } from "./SectionCard";
import { OrganizationUserActionsCell } from "./OrganizationUserActionsCell";
import { StylizedDataGrid } from "@/components/StylizedDataGrid";

type User = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};

type OrganizationUsersTableProps = {
  users: User[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export const OrganizationUsersTable: FC<OrganizationUsersTableProps> = ({
  users,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const columns: GridColDef<User>[] = useMemo(
    () => [
      {
        field: "fullName",
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
        field: "role",
        headerName: "Rol",
        minWidth: 150,
        flex: 0.5,
        cellClassName: "content-center",
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
            userId={params.row.id}
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
