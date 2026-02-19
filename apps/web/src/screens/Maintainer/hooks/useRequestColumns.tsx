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
} from "@repo/types";

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
        renderCell: (params) => (
          <RequestStatusChip status={params.row.status} />
        ),
      },
      {
        field: "requestedAt",
        headerName: "Fecha Envío",
        cellClassName,
        flex: 0.8,
      },
      {
        field: "actions",
        headerName: "Acciones",
        cellClassName,
        flex: 0.5,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const status = params.row.status;
          const showApproveReject = status === RequestStatus.PENDING;

          return (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton size="small">
                <VisibilityOutlined fontSize="small" />
              </IconButton>
              {showApproveReject && (
                <>
                  <IconButton
                    size="small"
                    color="success"
                    sx={(theme) => ({
                      backgroundColor: alpha(theme.palette.success.light, 0.1),
                    })}
                  >
                    <CheckOutlined fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
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
