import { FC } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import type { GetBadgePreviewsResponse } from "@repo/types";
import { StylizedDataGrid } from "@/components/StylizedDataGrid";
import { OverflowTooltipText } from "@/components";
import { VOCAB } from "@/config/vocab";
import {
  RecognitionBadge,
  type TransparencyRecognitions,
} from "./RecognitionBadge";
import Typography from "@mui/material/Typography";

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
    headerName: `Nombre ${orgNoun.singular}`,
    flex: 1.5,
    minWidth: 220,
    renderCell: (params) => (
      <OverflowTooltipText>{params.row.organizationName}</OverflowTooltipText>
    ),
  },
  {
    field: "sectorName",
    headerName: "Rubro",
    flex: 1,
    minWidth: 180,
    renderCell: (params) =>
      params.row.sectorName ? (
        <OverflowTooltipText>{params.row.sectorName}</OverflowTooltipText>
      ) : (
        <Typography color="textDisabled" className="italic" variant="body2">
          -
        </Typography>
      ),
  },
  {
    field: "subsectorName",
    headerName: "Sub-rubro",
    flex: 1,
    minWidth: 180,
    renderCell: (params) =>
      params.row.subsectorName ? (
        <OverflowTooltipText>{params.row.subsectorName}</OverflowTooltipText>
      ) : (
        <Typography color="textDisabled" className="italic" variant="body2">
          -
        </Typography>
      ),
  },
  {
    field: "year",
    headerName: "Año",
    width: 80,
    align: "center",
    headerAlign: "center",
  },
  {
    field: "recognitions",
    headerName: "Tipo de Reconocimiento",
    flex: 1.2,
    minWidth: 250,
    sortable: false,
    filterable: false,
    renderCell: (params) => (
      <RecognitionBadge
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
