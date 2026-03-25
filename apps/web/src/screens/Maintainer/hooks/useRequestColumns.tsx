import { useMemo, useCallback } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { alpha, IconButton, Stack, useTheme, type Theme } from "@mui/material";
import { useSnackbar } from "notistack";
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
  SubmissionType as RequestType,
} from "@repo/types";
import { useApproveRequest } from "@/api/query/requests/useApproveRequest";
import { useRejectRequest } from "@/api/query/requests/useRejectRequest";
import { capitalize } from "lodash-es";
import { VOCAB } from "@/config/vocab";

// ASSETS FOR RENDERING THE STATUS COLUMN

const STATUS_LABEL: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: "Pendiente",
  [RequestStatus.APPROVED]: "Aprobada",
  [RequestStatus.OBJECTED]: "Objetada",
  [RequestStatus.REJECTED]: "Rechazada",
};

const getStatusColor = (status: RequestStatus, theme: Theme): string => {
  const map: Record<RequestStatus, string> = {
    [RequestStatus.PENDING]: theme.palette.warning.light,
    [RequestStatus.APPROVED]: theme.palette.success.light,
    [RequestStatus.OBJECTED]: theme.palette.warning.light,
    [RequestStatus.REJECTED]: theme.palette.error.light,
  };
  return map[status];
};

const STATUS_SORT_ORDER: Record<string, number> = {
  [STATUS_LABEL[RequestStatus.PENDING]]: 0,
  [STATUS_LABEL[RequestStatus.APPROVED]]: 1,
  [STATUS_LABEL[RequestStatus.OBJECTED]]: 2,
  [STATUS_LABEL[RequestStatus.REJECTED]]: 3,
};

// ASSETS FOR RENDERING THE TYPE COLUMN

const TYPE_LABEL: Record<RequestType, string> = {
  [RequestType.ORGANIZATION_ACCREDITATION]: "Acreditación",
  [RequestType.CARBON_INVENTORY_CALCULATION]: "Diploma Medición",
  [RequestType.CARBON_INVENTORY_VERIFICATION]: "Sello Verificación",
  [RequestType.REDUCTION_PLAN_VERIFICATION]: "Sello Reducción",
  [RequestType.NEUTRALIZATION_PLAN_VERIFICATION]: "Sello Neutralización",
};

const TYPE_SORT_ORDER: Record<string, number> = {
  [TYPE_LABEL[RequestType.ORGANIZATION_ACCREDITATION]]: 0,
  [TYPE_LABEL[RequestType.CARBON_INVENTORY_CALCULATION]]: 1,
  [TYPE_LABEL[RequestType.CARBON_INVENTORY_VERIFICATION]]: 2,
  [TYPE_LABEL[RequestType.REDUCTION_PLAN_VERIFICATION]]: 3,
  [TYPE_LABEL[RequestType.NEUTRALIZATION_PLAN_VERIFICATION]]: 4,
};

export const useRequestColumns = (): GridColDef<
  GetAllAdminRequestsResponse[number]
>[] => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const cellClassName = "content-center";
  const { mutateAsync: approveRequest, isPending: isApproving } =
    useApproveRequest();
  const { mutateAsync: rejectRequest, isPending: isRejecting } =
    useRejectRequest();

  const handleApprove = useCallback(
    async (id: string) => {
      try {
        await approveRequest({ id });
        enqueueSnackbar("Solicitud aprobada correctamente", {
          variant: "success",
        });
      } catch {
        enqueueSnackbar("Error al aprobar la solicitud", { variant: "error" });
      }
    },
    [approveRequest, enqueueSnackbar]
  );
  const handleReject = useCallback(
    async (id: string) => {
      try {
        await rejectRequest({ id });
        enqueueSnackbar("Solicitud rechazada correctamente", {
          variant: "success",
        });
      } catch {
        enqueueSnackbar("Error al rechazar la solicitud", { variant: "error" });
      }
    },
    [rejectRequest, enqueueSnackbar]
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
          <RequestTypeChip
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
        valueFormatter: (value: number | null) => value ?? "-",
      },
      {
        field: "status",
        headerName: "Estado",
        cellClassName,
        flex: 1,
        valueGetter: (_value, row) => STATUS_LABEL[row.status],
        sortComparator: (value1: string, value2: string, _, __) =>
          STATUS_SORT_ORDER[value1] - STATUS_SORT_ORDER[value2],
        renderCell: (params) => (
          <RequestStatusChip
            label={STATUS_LABEL[params.row.status]}
            color={getStatusColor(params.row.status, theme)}
          />
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
              {/* TODO: implement callback for this button */}
              <IconButton size="small" aria-label="Ver solicitud">
                <VisibilityOutlined fontSize="small" />
              </IconButton>
              {showApproveReject && (
                <>
                  <IconButton
                    size="small"
                    color="success"
                    aria-label="Aprobar solicitud"
                    onClick={() => handleApprove(params.row.id)}
                    disabled={isApproving || isRejecting}
                    sx={(theme) => ({
                      backgroundColor: alpha(theme.palette.success.light, 0.1),
                    })}
                  >
                    <CheckOutlined fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="Rechazar solicitud"
                    onClick={() => handleReject(params.row.id)}
                    disabled={isApproving || isRejecting}
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
    [theme, handleApprove, handleReject, isApproving, isRejecting]
  );
};
