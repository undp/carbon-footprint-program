import { FC } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { EmojiEventsOutlined } from "@mui/icons-material";
import { GridColDef } from "@mui/x-data-grid";
import { StylizedDataGrid } from "@/components";
import { GetOrganizationRecognitionsResponse } from "@repo/types";
import {
  CarbonInventoryRecognitionsSubmissionType,
  SUBMISSION_TABLE_LABELS,
} from "./constants";

const columns: GridColDef<GetOrganizationRecognitionsResponse[number]>[] = [
  {
    field: "earningDate",
    headerName: "Fecha otorgado",
    flex: 1,
    headerAlign: "center",
    align: "center",
    cellClassName: "content-center",
    valueFormatter: (value: string) =>
      value
        ? new Date(value).toLocaleDateString("es", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "-",
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
    valueFormatter: (value: CarbonInventoryRecognitionsSubmissionType) =>
      SUBMISSION_TABLE_LABELS[value],
  },
  {
    field: "totalEmissions",
    headerName: "Emisiones (tCO₂e)",
    flex: 1,
    valueFormatter: (value: number) =>
      value != null
        ? value.toLocaleString("es", { maximumFractionDigits: 0 })
        : "-",
  },
  {
    field: "actions",
    headerName: "Acciones",
    flex: 0.5,
    sortable: false,
    headerAlign: "center",
    align: "center",
    cellClassName: "content-center",
    renderCell: (params) =>
      params.row.recognitionFileUrl ? (
        <Tooltip title="Ver reconocimiento" placement="top">
          <IconButton
            size="small"
            color="success"
            onClick={() =>
              window.open(
                params.row.recognitionFileUrl!,
                "_blank",
                "noopener,noreferrer"
              )
            }
            title="Ver reconocimiento"
            sx={{
              border: 1,
              borderColor: "success.main",
              borderRadius: 1,
              p: "4px",
            }}
          >
            <EmojiEventsOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="No hay un reconocimiento disponible" placement="top">
          <EmojiEventsOutlined fontSize="small" color="disabled" />
        </Tooltip>
      ),
  },
];

interface RecognitionsTableProps {
  loading: boolean;
  rows: GetOrganizationRecognitionsResponse;
}

export const RecognitionsTable: FC<RecognitionsTableProps> = ({
  loading,
  rows,
}) => (
  <Box className="flex w-full flex-col gap-4 rounded-lg bg-white p-6">
    <Typography variant="h6" fontWeight={600}>
      Reconocimientos
    </Typography>
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
