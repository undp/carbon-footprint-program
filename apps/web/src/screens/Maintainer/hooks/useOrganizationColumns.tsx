import { useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { IconButton, Stack } from "@mui/material";
import {
  VisibilityOutlined,
  EditOutlined,
  DeleteOutlined,
  RestoreOutlined,
} from "@mui/icons-material";
import { OrganizationStatusChip } from "../components/OrganizationStatusChip";
import { GetAllOrganizationsResponse } from "@repo/types";
import { useOrganizationDisplayStatus } from "./useOrganizationDisplayStatus";

type OrganizationRow = GetAllOrganizationsResponse["data"][number];

interface UseOrganizationColumnsProps {
  onBlock: (id: string) => void;
  onUnblock: (id: string) => void;
}

export const useOrganizationColumns = ({
  onBlock,
  onUnblock,
}: UseOrganizationColumnsProps): GridColDef<OrganizationRow>[] => {
  const { getDisplayStatus, getColor, STATUS_LABEL, STATUS_SORT_ORDER } =
    useOrganizationDisplayStatus();
  const cellClassName = "content-center";

  return useMemo<GridColDef<OrganizationRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Empresa",

        cellClassName,
        flex: 1,
      },
      {
        field: "sectorName",
        headerName: "Rubro",

        cellClassName,
        flex: 0.9,
        valueFormatter: (value: string | null) => value ?? "-",
      },
      {
        field: "subsectorName",
        headerName: "Sub-Rubro",

        cellClassName,
        flex: 1,
        valueFormatter: (value: string | null) => value ?? "-",
      },
      {
        field: "sizeName",
        headerName: "Tamaño",

        cellClassName,
        flex: 0.7,
        valueFormatter: (value: string | null) => value ?? "-",
      },
      {
        field: "status",
        headerName: "Estado",
        valueGetter: (_value, row) =>
          STATUS_LABEL[
            getDisplayStatus(
              row.status,
              row.isAccredited,
              row.hasCarbonInventories
            )
          ],
        sortComparator: (value1: string, value2: string, _, __) =>
          STATUS_SORT_ORDER[value1] - STATUS_SORT_ORDER[value2],
        cellClassName,
        flex: 0.9,
        renderCell: (params) => {
          const displayStatus = getDisplayStatus(
            params.row.status,
            params.row.isAccredited,
            params.row.hasCarbonInventories
          );
          return (
            <OrganizationStatusChip
              label={STATUS_LABEL[displayStatus]}
              color={getColor(displayStatus)}
            />
          );
        },
      },
      {
        field: "lastMeasurement",
        headerName: "Última Medición",

        cellClassName,
        flex: 0.9,
        valueFormatter: (value: string | null) => {
          if (!value) return "-";
          return new Intl.DateTimeFormat("es", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(new Date(value));
        },
      },
      {
        field: "totalEmissions",
        headerName: "Emisiones (tCO₂e)",

        cellClassName,
        flex: 0.9,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value: number) => {
          if (!value) return "-";
          return new Intl.NumberFormat("es").format(value);
        },
      },
      {
        field: "actions",
        headerName: "Acciones",
        cellClassName,
        flex: 0.7,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          const isBlocked = params.row.status === "BLOCKED";
          return (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton size="small" aria-label="Ver empresa">
                <VisibilityOutlined fontSize="small" />
              </IconButton>
              <IconButton size="small" aria-label="Editar empresa">
                <EditOutlined fontSize="small" />
              </IconButton>
              {isBlocked ? (
                <IconButton
                  size="small"
                  aria-label="Restaurar empresa"
                  onClick={() => onUnblock(params.row.id)}
                >
                  <RestoreOutlined fontSize="small" />
                </IconButton>
              ) : (
                <IconButton
                  size="small"
                  aria-label="Eliminar empresa"
                  onClick={() => onBlock(params.row.id)}
                >
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              )}
            </Stack>
          );
        },
      },
    ],
    [
      getDisplayStatus,
      getColor,
      STATUS_LABEL,
      STATUS_SORT_ORDER,
      onBlock,
      onUnblock,
    ]
  );
};
