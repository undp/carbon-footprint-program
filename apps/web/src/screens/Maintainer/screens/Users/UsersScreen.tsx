import { FC, useCallback, useMemo, useState } from "react";
import { Box, Button, Card, Stack, Typography } from "@mui/material";
import { PersonAddOutlined } from "@mui/icons-material";
import { SystemRole } from "@repo/types";
import type { GetAllUsersResponse } from "@repo/types";
import { useUsers } from "@/api/query/users";
import { useMe } from "@/api/query/users/useMe";
import { Route } from "@/routes/admin/users";
import { UsersScreenKpiSection } from "./components/UsersScreenKpiSection";
import { UsersScreenTabs } from "./components/UsersScreenTabs";
import { UsersScreenTable } from "./components/UsersScreenTable";
import { PromoteUserDialog } from "./components/PromoteUserDialog";
import { ChangeRoleDialog } from "./components/ChangeRoleDialog";
import { UserRoleHistoryDialog } from "./components/UserRoleHistoryDialog";
import { useUsersColumns } from "./hooks/useUsersColumns";
import {
  USERS_SCREEN_TITLE,
  USERS_SCREEN_SUBTITLE,
  ACTION_LABELS,
  type TabKey,
} from "./constants";

export const UsersScreen: FC = () => {
  const { data: me } = useMe(true);
  const { data: users, isLoading } = useUsers();
  const { tab } = Route.useSearch();
  const activeTab: TabKey = tab ?? "usuarios";

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [changeRoleUserId, setChangeRoleUserId] = useState<string | null>(null);
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);

  const viewerRole = me?.role ?? SystemRole.USER;
  const viewerId = me?.id ?? "";
  const isSuperadmin = viewerRole === SystemRole.SUPERADMIN;

  const allUsers = useMemo<GetAllUsersResponse>(() => users ?? [], [users]);

  const filteredUsers = useMemo((): GetAllUsersResponse => {
    if (activeTab === "usuarios") {
      return allUsers.filter((u) => u.role === SystemRole.USER);
    }
    return allUsers.filter((u) => u.role !== SystemRole.USER);
  }, [allUsers, activeTab]);

  const superAdminCount = useMemo(
    () => allUsers.filter((u) => u.role === SystemRole.SUPERADMIN).length,
    [allUsers]
  );

  const changeRoleUser =
    allUsers.find((u) => u.id === changeRoleUserId) ?? null;
  const historyUser = allUsers.find((u) => u.id === historyUserId) ?? null;
  const historyUserName = historyUser
    ? [historyUser.firstName, historyUser.lastName].filter(Boolean).join(" ") ||
      historyUser.email ||
      historyUser.id
    : "";

  const handleViewHistory = useCallback((userId: string) => {
    setHistoryUserId(userId);
  }, []);

  const handleChangeRole = useCallback((userId: string) => {
    setChangeRoleUserId(userId);
  }, []);

  const columns = useUsersColumns({
    activeTab,
    viewerRole,
    viewerId,
    onViewHistory: handleViewHistory,
    onChangeRole: handleChangeRole,
  });

  return (
    <Box className="flex flex-col gap-6">
      <Card
        sx={{
          p: 2,
          borderRadius: "16px",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {USERS_SCREEN_TITLE}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {USERS_SCREEN_SUBTITLE}
            </Typography>
          </Box>
          {isSuperadmin && (
            <Button
              variant="contained"
              startIcon={<PersonAddOutlined />}
              size="small"
              onClick={() => setPromoteOpen(true)}
            >
              {ACTION_LABELS.promoteToAdmin}
            </Button>
          )}
        </Stack>
      </Card>

      <UsersScreenKpiSection />

      <Box>
        <UsersScreenTabs activeTab={activeTab} />
        <UsersScreenTable
          rows={filteredUsers}
          columns={columns}
          isLoading={isLoading}
        />
      </Box>

      {isSuperadmin && (
        <PromoteUserDialog
          open={promoteOpen}
          users={allUsers}
          onClose={() => setPromoteOpen(false)}
        />
      )}

      {isSuperadmin && (
        <ChangeRoleDialog
          open={changeRoleUserId !== null}
          user={changeRoleUser}
          viewerId={viewerId}
          superAdminCount={superAdminCount}
          onClose={() => setChangeRoleUserId(null)}
        />
      )}

      <UserRoleHistoryDialog
        open={historyUserId !== null}
        userId={historyUserId}
        userName={historyUserName}
        onClose={() => setHistoryUserId(null)}
      />
    </Box>
  );
};
