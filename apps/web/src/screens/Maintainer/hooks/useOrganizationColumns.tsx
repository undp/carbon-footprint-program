import { useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { IconButton, Stack } from "@mui/material";
import {
  VisibilityOutlined,
  HistoryOutlined,
  BlockOutlined,
  LockOpenOutlined,
} from "@mui/icons-material";
import { OrganizationStatusChip } from "../components/OrganizationStatusChip";
import { GetAllOrganizationsResponse } from "@repo/types";
import { useOrganizationDisplayStatus } from "./useOrganizationDisplayStatus";
import { capitalize } from "lodash-es";
import { VOCAB } from "@/config/vocab";

type OrganizationRow = GetAllOrganizationsResponse["data"][number];

interface UseOrganizationColumnsProps {
  onView: (id: string) => void;
  onViewHistory: (id: string) => void;
  onBlock: (id: string) => void;
  onUnblock: (id: string) => void;
}

export const useOrganizationColumns = ({
  onView,
  onViewHistory,
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
        headerName: capitalize(VOCAB.organization.noun.singular),

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
          if (value == null || Number.isNaN(value)) return "-";
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
              <IconButton
                size="small"
                aria-label={`Ver ${VOCAB.organization.noun.singular}`}
                onClick={() => onView(params.row.id)}
              >
                <VisibilityOutlined fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label={`Ver historial de ${VOCAB.organization.noun.singular}`}
                onClick={() => onViewHistory(params.row.id)}
              >
                <HistoryOutlined fontSize="small" />
              </IconButton>
              {isBlocked ? (
                <IconButton
                  size="small"
                  aria-label={`Restaurar ${VOCAB.organization.noun.singular}`}
                  onClick={() => onUnblock(params.row.id)}
                >
                  <LockOpenOutlined fontSize="small" />
                </IconButton>
              ) : (
                <IconButton
                  size="small"
                  aria-label={`Bloquear ${VOCAB.organization.noun.singular}`}
                  onClick={() => onBlock(params.row.id)}
                >
                  <BlockOutlined fontSize="small" />
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
      onView,
      onViewHistory,
      onBlock,
      onUnblock,
    ]
  );
};
