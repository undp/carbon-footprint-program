import { useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { alpha, IconButton, Stack } from "@mui/material";
import {
  VisibilityOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@mui/icons-material";
import { RequestStatusChip } from "../components/RequestStatusChip";
import { RequestTypeChip } from "../components/RequestTypeChip";
import {
  GetAllAdminRequestsResponse,
  SubmissionStatus as RequestStatus,
  SubmissionSubjectType as RequestType,
} from "@repo/types";

const STATUS_SORT_ORDER: Record<RequestStatus, number> = {
  [RequestStatus.PENDING]: 0,
  [RequestStatus.APPROVED]: 1,
  [RequestStatus.REJECTED]: 2,
};

const TYPE_SORT_ORDER: Record<RequestType, number> = {
  [RequestType.ORGANIZATION_ACCREDITATION]: 0,
  [RequestType.CARBON_INVENTORY_CALCULATION]: 1,
  [RequestType.CARBON_INVENTORY_VERIFICATION]: 2,
  [RequestType.REDUCTION_PLAN_VERIFICATION]: 3,
  [RequestType.NEUTRALIZATION_PLAN_VERIFICATION]: 4,
};

export const useRequestColumns = (): GridColDef<
  GetAllAdminRequestsResponse[number]
>[] => {
  const cellClassName = "content-center";

  return useMemo<GridColDef<GetAllAdminRequestsResponse[number]>[]>(
    () => [
      {
        field: "organizationName",
        headerName: "Empresa",
        cellClassName,
        flex: 1,
      },
      {
        field: "type",
        headerName: "Tipo",
        cellClassName,
        flex: 1,
        valueGetter: (_value, row) => TYPE_SORT_ORDER[row.type],
        renderCell: (params) => <RequestTypeChip type={params.row.type} />,
      },
      {
        field: "year",
        headerName: "Periodo",
        cellClassName,
        flex: 0.8,
      },
      {
        field: "status",
        headerName: "Estado",
        cellClassName,
        flex: 1,
        valueGetter: (_value, row) => STATUS_SORT_ORDER[row.status],
        renderCell: (params) => (
          <RequestStatusChip status={params.row.status} />
        ),
      },
      {
        field: "requestedAt",
        headerName: "Fecha Envío",
        cellClassName,
        flex: 0.8,
        valueFormatter: (value: string) => {
          return new Intl.DateTimeFormat("es", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(new Date(value));
        },
      },
      {
        field: "actions",
        headerName: "Acciones",
        cellClassName,
        flex: 0.5,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          const status = params.row.status;
          const showApproveReject = status === RequestStatus.PENDING;

          return (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton size="small" aria-label="View request">
                <VisibilityOutlined fontSize="small" />
              </IconButton>
              {showApproveReject && (
                <>
                  <IconButton
                    size="small"
                    color="success"
                    aria-label="Approve request"
                    sx={(theme) => ({
                      backgroundColor: alpha(theme.palette.success.light, 0.1),
                    })}
                  >
                    <CheckOutlined fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="Reject request"
                    sx={(theme) => ({
                      backgroundColor: alpha(theme.palette.error.light, 0.1),
                    })}
                  >
                    <CloseOutlined fontSize="small" />
                  </IconButton>
                </>
              )}
            </Stack>
          );
        },
      },
    ],
    []
  );
};
