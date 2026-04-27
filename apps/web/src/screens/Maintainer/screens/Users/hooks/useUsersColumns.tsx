import { useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { IconButton, Stack, Tooltip } from "@mui/material";
import { HistoryOutlined, ManageAccountsOutlined } from "@mui/icons-material";
import { SystemRole } from "@repo/types";
import type { GetAllUsersResponse } from "@repo/types";
import { UserRoleChip } from "../components/UserRoleChip";
import { ACTION_LABELS, COLUMN_HEADERS, type TabKey } from "../constants";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type UserRow = GetAllUsersResponse[number];

interface UseUsersColumnsProps {
  activeTab: TabKey;
  viewerRole: SystemRole;
  viewerId: string;
  onViewHistory: (userId: string) => void;
  onChangeRole: (userId: string) => void;
}

export const useUsersColumns = ({
  activeTab,
  viewerRole,
  viewerId,
  onViewHistory,
  onChangeRole,
}: UseUsersColumnsProps): GridColDef<UserRow>[] => {
  const cellClassName = "content-center";
  const isSuperadmin = viewerRole === SystemRole.SUPERADMIN;
  const showChangeRole = activeTab === "administradores" && isSuperadmin;

  return useMemo<GridColDef<UserRow>[]>(
    () => [
      {
        field: "name",
        headerName: COLUMN_HEADERS.name,
        cellClassName,
        flex: 1.2,
        valueGetter: (_value, row) =>
          [row.firstName, row.lastName].filter(Boolean).join(" ") || "-",
      },
      {
        field: "email",
        headerName: COLUMN_HEADERS.email,
        cellClassName,
        flex: 1.5,
        valueFormatter: (value: string | null) => value ?? "-",
      },
      {
        field: "jobPositionName",
        headerName: COLUMN_HEADERS.jobPosition,
        cellClassName,
        flex: 1,
        valueFormatter: (value: string | null) => value ?? "-",
      },
      {
        field: "role",
        headerName: COLUMN_HEADERS.role,
        cellClassName,
        flex: 0.9,
        renderCell: (params) => <UserRoleChip role={params.row.role} />,
      },
      {
        field: "createdAt",
        headerName: COLUMN_HEADERS.createdAt,
        cellClassName,
        flex: 0.9,
        valueFormatter: (value: string | null) => {
          if (!value) return "-";
          return format(new Date(value), "d MMM yyyy", { locale: es });
        },
      },
      {
        field: "actions",
        headerName: COLUMN_HEADERS.actions,
        cellClassName,
        flex: showChangeRole ? 0.8 : 0.6,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          const isOwnRow = params.row.id === viewerId;
          return (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title={ACTION_LABELS.viewHistory}>
                <IconButton
                  size="small"
                  aria-label={ACTION_LABELS.viewHistory}
                  onClick={() => onViewHistory(params.row.id)}
                >
                  <HistoryOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
              {showChangeRole && !isOwnRow && (
                <Tooltip title={ACTION_LABELS.changeRole}>
                  <IconButton
                    size="small"
                    aria-label={ACTION_LABELS.changeRole}
                    onClick={() => onChangeRole(params.row.id)}
                  >
                    <ManageAccountsOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          );
        },
      },
    ],
    [
      activeTab,
      viewerRole,
      viewerId,
      onViewHistory,
      onChangeRole,
      showChangeRole,
    ]
  );
};
