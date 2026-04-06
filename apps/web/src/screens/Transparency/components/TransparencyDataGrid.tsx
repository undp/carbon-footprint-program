import { FC } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { RecognitionSeals } from "./RecognitionSeals";

export interface TransparencyRow {
  id: number;
  companyName: string;
  sectorName: string | null;
  subsectorName: string | null;
  recognitions: {
    measurement: boolean;
    verification: boolean;
    reduction: boolean;
  };
  year: number;
}

interface TransparencyDataGridProps {
  data: TransparencyRow[];
  loading: boolean;
}

const columns: GridColDef<TransparencyRow>[] = [
  {
    field: "companyName",
    headerName: "NOMBRE EMPRESA",
    flex: 1.5,
    minWidth: 220,
  },
  {
    field: "sectorName",
    headerName: "RUBRO",
    flex: 1,
    minWidth: 180,
    valueGetter: (_value, row) => row.sectorName ?? "—",
  },
  {
    field: "subsectorName",
    headerName: "SUB-RUBRO",
    flex: 1,
    minWidth: 180,
    valueGetter: (_value, row) => row.subsectorName ?? "—",
  },
  {
    field: "year",
    headerName: "AÑO",
    width: 80,
    align: "center",
    headerAlign: "center",
  },
  {
    field: "recognitions",
    headerName: "TIPO DE RECONOCIMIENTO",
    flex: 1.2,
    minWidth: 250,
    sortable: false,
    filterable: false,
    renderCell: (params) => (
      <RecognitionSeals recognitions={params.row.recognitions} size={32} />
    ),
  },
];

export const TransparencyDataGrid: FC<TransparencyDataGridProps> = ({
  data,
  loading,
}) => {

  return (
    <DataGrid
      rows={data}
      columns={columns}
      loading={loading}
      pageSizeOptions={[10, 25, 50]}
      initialState={{
        pagination: { paginationModel: { pageSize: 25 } },
      }}
      rowHeight={64}
      disableRowSelectionOnClick
      disableColumnMenu
      disableColumnResize
      disableColumnSorting
      sx={{
        height: "calc(100vh - 300px)",
        minHeight: 400,
        border: "1px solid #E0E0E0",
        borderRadius: "8px",
        overflow: "hidden",
        "& .MuiDataGrid-columnHeaders": {
          backgroundColor: "#F9F9F9",
          borderBottom: "1px solid #E0E0E0",
        },
        "& .MuiDataGrid-columnHeader": {
          backgroundColor: "#F9F9F9",
        },
        "& .MuiDataGrid-columnHeaderTitle": {
          fontWeight: 500,
          color: "#757575",
          fontSize: "0.75rem",
          letterSpacing: "0.05em",
        },
        "& .MuiDataGrid-columnSeparator": {
          display: "none",
        },
        "& .MuiDataGrid-cell": {
          borderBottom: "none",
          display: "flex",
          alignItems: "center",
          color: "#414046",
          fontSize: "0.875rem",
          maxHeight: "none !important",
        },
        "& .MuiDataGrid-row": {
          minHeight: "64px !important",
          maxHeight: "none !important",
          borderBottom: "1px solid #F0F0F0",
        },
        "& .MuiDataGrid-cell--withRenderer": {
          display: "flex",
          alignItems: "center",
        },
        "& .MuiDataGrid-footerContainer": {
          borderTop: "1px solid #E0E0E0",
        },
      }}
    />
  );
};
