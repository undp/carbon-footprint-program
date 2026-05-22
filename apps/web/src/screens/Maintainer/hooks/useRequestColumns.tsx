import { useMemo, useCallback } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { Stack, useTheme } from "@mui/material";
import { VisibilityOutlined, EditOutlined } from "@mui/icons-material";
import { StatusChip } from "@/components/StatusChip";
import { CustomPaletteChip } from "@/components/CustomPaletteChip";
import { AdminActionButton } from "@/components/AdminActionButton";
import {
  GetAllAdminRequestsResponse,
  SubmissionStatus as RequestStatus,
} from "@repo/types";
import { capitalize } from "lodash-es";
import { VOCAB } from "@/config/vocab";
import { formatter } from "@/utils/formatting";
import {
  SUBMISSION_STATUS_CONFIG,
  SUBMISSION_STATUS_SORT_ORDER_BY_LABEL,
} from "@/labels/status/submission";
import {
  SUBMISSION_TYPE_LABELS,
  SUBMISSION_TYPE_SORT_ORDER_BY_LABEL,
} from "@/labels/status/submissionType";

interface Props {
  onView: (row: GetAllAdminRequestsResponse[number]) => void;
}

export const useRequestColumns = ({
  onView,
}: Props): GridColDef<GetAllAdminRequestsResponse[number]>[] => {
  const theme = useTheme();
  const cellClassName = "content-center";

  const handleView = useCallback(
    (row: GetAllAdminRequestsResponse[number]) => onView(row),
    [onView]
  );

  return useMemo<GridColDef<GetAllAdminRequestsResponse[number]>[]>(
    () => [
      {
        field: "organizationName",
        headerName: capitalize(VOCAB.organization.noun.singular),
        cellClassName,
        flex: 1,
      },
      {
        field: "type",
        headerName: "Tipo",
        cellClassName,
        flex: 1,
        valueGetter: (_value, row) => SUBMISSION_TYPE_LABELS[row.type].label,
        sortComparator: (value1: string, value2: string) =>
          SUBMISSION_TYPE_SORT_ORDER_BY_LABEL[value1] -
          SUBMISSION_TYPE_SORT_ORDER_BY_LABEL[value2],
        renderCell: (params) => (
          <CustomPaletteChip
            config={{
              ...SUBMISSION_TYPE_LABELS[params.row.type],
              color: theme.palette.requestTypeColors[params.row.type],
            }}
          />
        ),
      },
      {
        field: "year",
        headerName: "Periodo",
        cellClassName,
        flex: 0.8,
        maxWidth: 140,
        valueFormatter: (value: number | null) => value ?? "-",
      },
      {
        field: "status",
        headerName: "Estado",
        cellClassName,
        flex: 0.7,
        valueGetter: (_value, row) =>
          SUBMISSION_STATUS_CONFIG[row.status].label,
        sortComparator: (value1: string, value2: string) =>
          SUBMISSION_STATUS_SORT_ORDER_BY_LABEL[value1] -
          SUBMISSION_STATUS_SORT_ORDER_BY_LABEL[value2],
        renderCell: (params) => (
          <StatusChip config={SUBMISSION_STATUS_CONFIG[params.row.status]} />
        ),
      },
      {
        field: "requestedAt",
        headerName: "Fecha Envío",
        cellClassName,
        flex: 0.7,
        valueFormatter: (value: string) => formatter.date(value),
      },
      {
        field: "actions",
        headerAlign: "center",
        headerName: "Acciones",
        cellClassName,
        flex: 0.5,
        sortable: false,
        filterable: false,
        disableExport: true,
        disableColumnMenu: true,
        renderCell: (params) => {
          const isPending = params.row.status === RequestStatus.PENDING;
          return (
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              justifyContent="center"
            >
              <AdminActionButton
                icon={isPending ? EditOutlined : VisibilityOutlined}
                tooltip={isPending ? "Editar solicitud" : "Ver solicitud"}
                onClick={() => handleView(params.row)}
              />
            </Stack>
          );
        },
      },
    ],
    [theme, handleView]
  );
};
