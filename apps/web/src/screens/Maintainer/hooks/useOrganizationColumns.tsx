import { useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { Stack } from "@mui/material";
import {
  VisibilityOutlined,
  HistoryOutlined,
  BlockOutlined,
  LockOpenOutlined,
} from "@mui/icons-material";
import { StatusChip } from "@/components/StatusChip";
import { AdminActionButton } from "@/components/AdminActionButton";
import { GetAllOrganizationsResponse } from "@repo/types";
import {
  AdminOrganizationDisplayStatus,
  getDisplayStatus,
} from "./organizationDisplayStatus";
import {
  ADMIN_ORGANIZATION_STATUS_CONFIG,
  ADMIN_ORGANIZATION_STATUS_SORT_ORDER,
} from "@/labels/chips/organization";
import { capitalize } from "lodash-es";
import { VOCAB } from "@/config/vocab";
import { formatter } from "@/utils/formatting";
import { toValueOptions } from "@/utils/dataGrid";

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
        type: "singleSelect",
        valueOptions: toValueOptions(ADMIN_ORGANIZATION_STATUS_CONFIG),
        valueGetter: (_value, row) =>
          getDisplayStatus(
            row.status,
            row.isAccredited,
            row.hasCarbonInventories
          ),
        sortComparator: (
          v1: AdminOrganizationDisplayStatus,
          v2: AdminOrganizationDisplayStatus
        ) =>
          ADMIN_ORGANIZATION_STATUS_SORT_ORDER[v1] -
          ADMIN_ORGANIZATION_STATUS_SORT_ORDER[v2],
        cellClassName,
        flex: 0.9,
        renderCell: (params) => (
          <StatusChip
            config={
              ADMIN_ORGANIZATION_STATUS_CONFIG[
                params.value as AdminOrganizationDisplayStatus
              ]
            }
          />
        ),
      },
      {
        field: "lastMeasurement",
        headerName: "Última Medición",

        cellClassName,
        flex: 0.9,
        valueFormatter: (value: string | null) => formatter.date(value),
      },
      {
        field: "totalEmissions",
        headerName: "Emisiones (tCO₂e)",

        cellClassName,
        flex: 0.9,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value: number) =>
          formatter.emissions(value, { withSuffix: false }),
      },
      {
        field: "actions",
        headerName: "Acciones",
        cellClassName,
        flex: 0.7,
        sortable: false,
        filterable: false,
        disableExport: true,
        disableColumnMenu: true,
        renderCell: (params) => {
          const isBlocked = params.row.status === "BLOCKED";
          return (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <AdminActionButton
                icon={VisibilityOutlined}
                tooltip={`Ver detalles de ${VOCAB.organization.noun.singular}`}
                onClick={() => onView(params.row.id)}
              />
              <AdminActionButton
                icon={HistoryOutlined}
                tooltip={`Ver historial de ${VOCAB.organization.noun.singular}`}
                onClick={() => onViewHistory(params.row.id)}
              />
              {isBlocked ? (
                <AdminActionButton
                  icon={LockOpenOutlined}
                  tooltip={`Desbloquear ${VOCAB.organization.noun.singular}`}
                  onClick={() => onUnblock(params.row.id)}
                />
              ) : (
                <AdminActionButton
                  icon={BlockOutlined}
                  tooltip={`Bloquear ${VOCAB.organization.noun.singular}`}
                  onClick={() => onBlock(params.row.id)}
                />
              )}
            </Stack>
          );
        },
      },
    ],
    [onView, onViewHistory, onBlock, onUnblock]
  );
};
