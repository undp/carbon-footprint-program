import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { EmojiEventsOutlined } from "@mui/icons-material";
import { GridColDef } from "@mui/x-data-grid";
import { AppActionButton, InfoButton, StylizedDataGrid } from "@/components";
import { useExplanationDialog } from "@/contexts";
import {
  GetOrganizationRecognitionsResponse,
  CarbonInventoryRecognitionsType,
} from "@repo/types";
import { RECOGNITION_TYPE_LABEL } from "@/utils/recognitions";
import { SUBMISSION_TYPE_SORT_ORDER } from "@/labels/chips/submissionType";
import { formatter } from "@/utils/formatting";

const columns: GridColDef<GetOrganizationRecognitionsResponse[number]>[] = [
  {
    field: "earningDate",
    headerName: "Fecha otorgado",
    flex: 1,
    headerAlign: "center",
    align: "center",
    cellClassName: "content-center",
    valueFormatter: (value: string) => formatter.dateNumeric(value),
  },
  {
    field: "measurementYear",
    headerName: "Año medición",
    flex: 1,
    headerAlign: "center",
    align: "center",
    cellClassName: "content-center",
  },
  {
    field: "submissionType",
    headerName: "Reconocimiento",
    flex: 1.5,
    headerAlign: "center",
    align: "center",
    cellClassName: "content-center",
    valueFormatter: (value: CarbonInventoryRecognitionsType) =>
      RECOGNITION_TYPE_LABEL[value],
    sortComparator: (
      v1: CarbonInventoryRecognitionsType,
      v2: CarbonInventoryRecognitionsType
    ) => SUBMISSION_TYPE_SORT_ORDER[v1] - SUBMISSION_TYPE_SORT_ORDER[v2],
  },
  {
    field: "totalEmissions",
    headerName: "Emisiones (tCO₂e)",
    flex: 1,
    valueFormatter: (value: number) =>
      formatter.emissions(value, { withSuffix: false }),
  },
  {
    field: "actions",
    headerName: "Acciones",
    flex: 0.5,
    sortable: false,
    headerAlign: "center",
    align: "center",
    cellClassName: "content-center",
    renderCell: (params) => {
      const fileUrl = params.row.recognitionFileUrl;
      return (
        <AppActionButton
          tooltip={fileUrl ? "Ver archivo" : "No hay un archivo disponible"}
          tooltipPlacement="top"
          color={fileUrl ? "success" : undefined}
          disabled={!fileUrl}
          onClick={
            fileUrl
              ? () => window.open(fileUrl, "_blank", "noopener,noreferrer")
              : undefined
          }
        >
          <EmojiEventsOutlined fontSize="small" />
        </AppActionButton>
      );
    },
  },
];

interface RecognitionsTableProps {
  loading: boolean;
  rows: GetOrganizationRecognitionsResponse;
  explanationSlug?: string;
}

export const RecognitionsTable: FC<RecognitionsTableProps> = ({
  loading,
  rows,
  explanationSlug,
}) => {
  const { openExplanationBySlug } = useExplanationDialog();

  return (
    <Box className="flex w-full flex-col gap-4 rounded-lg bg-white p-6">
      <Box className="flex items-center gap-1">
        <Typography variant="h6" fontWeight={600}>
          Reconocimientos
        </Typography>
        {explanationSlug && (
          <InfoButton
            label="Más información"
            onClick={() => openExplanationBySlug(explanationSlug)}
          />
        )}
      </Box>
      <StylizedDataGrid
        sx={{
          "& .MuiDataGrid-cell": {
            padding: 0,
          },
        }}
        loading={loading}
        getRowHeight={() => 48}
        disableColumnSorting={false}
        columns={columns}
        rows={rows}
        getRowId={(row: GetOrganizationRecognitionsResponse[number]) =>
          `${row.submissionId}-${row.submissionType}`
        }
      />
    </Box>
  );
};
