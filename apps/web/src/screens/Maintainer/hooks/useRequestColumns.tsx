import { useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { alpha, IconButton, Stack } from "@mui/material";
import {
  VisibilityOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@mui/icons-material";

export interface RequestRow {
  id: string;
  empresa: string;
  tipo: string;
  periodo: string;
  estado: string;
  fechaEnvio: string;
}

export const useRequestColumns = (): GridColDef<RequestRow>[] => {
  return useMemo<GridColDef<RequestRow>[]>(
    () => [
      {
        field: "empresa",
        headerName: "Empresa",
        flex: 1,
      },
      {
        field: "tipo",
        headerName: "Tipo",
        flex: 1,
      },
      {
        field: "periodo",
        headerName: "Periodo",
        flex: 0.8,
      },
      {
        field: "estado",
        headerName: "Estado",
        flex: 1,
      },
      {
        field: "fechaEnvio",
        headerName: "Fecha Envío",
        flex: 0.8,
      },
      {
        field: "actions",
        headerName: "Acciones",
        flex: 0.5,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const estado = params.row.estado;

          // TODO: use real enum
          const showApproveReject =
            estado === "En Revisión" || estado === "Pendiente";

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
