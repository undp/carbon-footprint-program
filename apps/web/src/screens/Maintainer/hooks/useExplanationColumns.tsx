import { useMemo } from "react";
import { Button, Typography } from "@mui/material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type { GetAllExplanationsResponse } from "@repo/types";

type ExplanationRow = GetAllExplanationsResponse[number];

interface UseExplanationColumnsParams {
  onEdit: (slug: string) => void;
}

export const useExplanationColumns = ({
  onEdit,
}: UseExplanationColumnsParams): GridColDef<ExplanationRow>[] =>
  useMemo(
    () => [
      {
        field: "name",
        headerName: "Nombre",
        flex: 1,
        minWidth: 220,
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 1.5,
        minWidth: 280,
        renderCell: (params: GridRenderCellParams<ExplanationRow>) => (
          <Typography variant="body2" color="text.secondary" component="span">
            {params.row.description ?? "—"}
          </Typography>
        ),
      },
      {
        field: "explanation",
        headerName: "Explicación",
        filterable: false,
        disableColumnMenu: true,
        sortable: false,
        disableExport: true,
        width: 140,
        renderCell: (params: GridRenderCellParams<ExplanationRow>) => (
          <Button
            size="small"
            variant="outlined"
            aria-label={`Editar explicación ${params.row.name}`}
            onClick={() => onEdit(params.row.slug)}
          >
            Editar
          </Button>
        ),
      },
    ],
    [onEdit]
  );
