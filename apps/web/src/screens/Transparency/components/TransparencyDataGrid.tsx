import { FC } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import type { GetBadgePreviewsResponse } from "@repo/types";
import { StylizedDataGrid } from "@/components/StylizedDataGrid";
import { VOCAB } from "@/config/vocab";
import {
  RecognitionSeals,
  type TransparencyRecognitions,
} from "./RecognitionSeals";

const orgNoun = VOCAB.organization.noun;

export interface TransparencyRow {
  id: number;
  organizationName: string;
  sectorName: string | null;
  subsectorName: string | null;
  recognitions: TransparencyRecognitions;
  year: number;
}

interface TransparencyDataGridProps {
  data: TransparencyRow[];
  loading: boolean;
  badgePreviews: GetBadgePreviewsResponse;
}

const buildColumns = (
  badgePreviews: GetBadgePreviewsResponse
): GridColDef<TransparencyRow>[] => [
  {
    field: "organizationName",
    headerName: `NOMBRE ${orgNoun.singular.toUpperCase()}`,
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
      <RecognitionSeals
        recognitions={params.row.recognitions}
        badgePreviews={badgePreviews}
        size={32}
      />
    ),
  },
];

export const TransparencyDataGrid: FC<TransparencyDataGridProps> = ({
  data,
  loading,
  badgePreviews,
}) => {
  const columns = buildColumns(badgePreviews);

  return (
    <StylizedDataGrid
      rows={data}
      columns={columns}
      loading={loading}
      autoHeight
      columnHeaderHeight={40}
      hideFooter={false}
      pageSizeOptions={[10, 25, 50]}
      initialState={{
        pagination: { paginationModel: { pageSize: 25 } },
      }}
      localeText={{
        noRowsLabel: `No hay ${orgNoun.plural} disponibles`,
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
  );
};
