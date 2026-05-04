import { useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { HistoryOutlined, ManageAccountsOutlined } from "@mui/icons-material";
import { SystemRole } from "@repo/types";
import type { GetAllUsersResponse } from "@repo/types";
import { UserRoleChip } from "../components/UserRoleChip";
import { ACTION_LABELS, COLUMN_HEADERS, type TabKey } from "../constants";
import { ORGANIZATION_ROLE_LABELS } from "@/labels";
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
  const showChangeRole = isSuperadmin;
  const isUsuariosTab = activeTab === "usuarios";

  return useMemo<GridColDef<UserRow>[]>(
    () => [
      {
        field: "email",
        headerName: COLUMN_HEADERS.email,
        cellClassName,
        flex: 1.5,
        valueFormatter: (value: string | null) => value ?? "-",
      },
      ...(isUsuariosTab
        ? [
            {
              field: "organizationsAndRoles",
              headerName: COLUMN_HEADERS.organizationsAndRoles,
              cellClassName,
              flex: 2.4,
              sortable: false,
              renderCell: (params: { row: UserRow }) => {
                const orgs = params.row.organizations;
                if (orgs.length === 0) return "-";
                return (
                  <Stack spacing={0.5} sx={{ py: 0.5 }} alignItems="flex-start">
                    {orgs.map((org) => (
                      <Stack
                        key={org.organizationId}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ maxWidth: "100%" }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={org.organizationName}
                        >
                          {org.organizationName}
                        </Typography>
                        <Chip
                          label={ORGANIZATION_ROLE_LABELS[org.role]}
                          size="small"
                          variant="outlined"
                          sx={{ flexShrink: 0 }}
                        />
                      </Stack>
                    ))}
                  </Stack>
                );
              },
            } satisfies GridColDef<UserRow>,
          ]
        : []),
      ...(!isUsuariosTab
        ? [
            {
              field: "role",
              headerName: COLUMN_HEADERS.role,
              cellClassName,
              flex: 0.9,
              renderCell: (params: { row: UserRow }) => (
                <UserRoleChip role={params.row.role} />
              ),
            } satisfies GridColDef<UserRow>,
          ]
        : []),
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
          const showChangeRoleButton = showChangeRole && !isOwnRow;
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
              {showChangeRole && (
                <Box
                  sx={{
                    visibility: showChangeRoleButton ? "visible" : "hidden",
                  }}
                >
                  <Tooltip title={ACTION_LABELS.changeRole}>
                    <IconButton
                      size="small"
                      aria-label={ACTION_LABELS.changeRole}
                      onClick={() => onChangeRole(params.row.id)}
                    >
                      <ManageAccountsOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Stack>
          );
        },
      },
    ],
    [viewerId, onViewHistory, onChangeRole, showChangeRole, isUsuariosTab]
  );
};
