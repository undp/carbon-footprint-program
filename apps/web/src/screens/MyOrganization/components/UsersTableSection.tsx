import { FC, useMemo } from "react";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Add } from "@mui/icons-material";
import { SectionCard } from "./SectionCard";
import { UserActionsCell } from "./UserActionsCell";

type User = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};

type UsersTableSectionProps = {
  users: User[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export const UsersTableSection: FC<UsersTableSectionProps> = ({
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
          <UserActionsCell
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
      <DataGrid
        autoHeight
        columnHeaderHeight={40}
        rows={users}
        columns={columns}
        checkboxSelection={false}
        disableColumnResize
        disableColumnSorting
        disableColumnMenu
        disableColumnFilter
        disableColumnSelector
        disableRowSelectionOnClick
        hideFooter
        getRowHeight={() => "auto"}
        localeText={{
          noRowsLabel: "No hay usuarios registrados",
        }}
        sx={(theme) => ({
          borderRadius: "8px",
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: theme.palette.background.default,
            padding: "10px 8px",
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
            padding: "10px 8px",
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
          "--DataGrid-overlayHeight": "56px",
        })}
      />
    </SectionCard>
  );
};
