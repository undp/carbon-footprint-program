import { useMemo, useCallback } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { Stack, useTheme } from "@mui/material";
import { VisibilityOutlined, EditOutlined } from "@mui/icons-material";
import { RequestStatusChip } from "../components/RequestStatusChip";
import { AdminActionButton } from "@/components/AdminActionButton";
import { SubmissionTypeChip } from "@components/SubmissionTypeChip";
import {
  GetAllAdminRequestsResponse,
  SubmissionStatus as RequestStatus,
  SubmissionType as RequestType,
} from "@repo/types";
import { capitalize } from "lodash-es";
import { VOCAB } from "@/config/vocab";
import { formatter } from "@/utils/formatting";
import {
  REQUEST_STATUS_LABEL as STATUS_LABEL,
  REQUEST_TYPE_LABEL as TYPE_LABEL,
  getRequestStatusColor,
} from "@/utils/submissions";

const STATUS_SORT_ORDER: Record<string, number> = {
  [STATUS_LABEL[RequestStatus.PENDING]]: 0,
  [STATUS_LABEL[RequestStatus.APPROVED]]: 1,
  [STATUS_LABEL[RequestStatus.REVIEWED]]: 2,
  [STATUS_LABEL[RequestStatus.REJECTED]]: 3,
};

const TYPE_SORT_ORDER: Record<string, number> = {
  [TYPE_LABEL[RequestType.ORGANIZATION_ACCREDITATION]]: 0,
  [TYPE_LABEL[RequestType.CARBON_INVENTORY_CALCULATION]]: 1,
  [TYPE_LABEL[RequestType.CARBON_INVENTORY_VERIFICATION]]: 2,
  [TYPE_LABEL[RequestType.REDUCTION_PROJECT_VERIFICATION]]: 3,
  [TYPE_LABEL[RequestType.NEUTRALIZATION_PLAN_VERIFICATION]]: 4,
};

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
        valueGetter: (_value, row) => TYPE_LABEL[row.type],
        sortComparator: (value1: string, value2: string, _, __) =>
          TYPE_SORT_ORDER[value1] - TYPE_SORT_ORDER[value2],
        renderCell: (params) => (
          <SubmissionTypeChip
            label={TYPE_LABEL[params.row.type]}
            color={theme.palette.requestTypeColors[params.row.type]}
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
        valueGetter: (_value, row) => STATUS_LABEL[row.status],
        sortComparator: (value1: string, value2: string, _, __) =>
          STATUS_SORT_ORDER[value1] - STATUS_SORT_ORDER[value2],
        renderCell: (params) => (
          <RequestStatusChip
            label={STATUS_LABEL[params.row.status]}
            color={getRequestStatusColor(params.row.status, theme)}
          />
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
