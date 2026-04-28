import { FC, useMemo } from "react";
import { Stack, useTheme } from "@mui/material";
import {
  PeopleOutlined,
  AdminPanelSettingsOutlined,
  TrendingUpOutlined,
  SecurityOutlined,
} from "@mui/icons-material";
import { SystemRole } from "@repo/types";
import { useUsers } from "@/api/query/users";
import { KpiSummaryCard } from "@/screens/AdminDashboard/components/KpiSummaryCard";
import { KPI_LABELS, type TabKey } from "../constants";

interface UsersScreenKpiSectionProps {
  activeTab: TabKey;
}

export const UsersScreenKpiSection: FC<UsersScreenKpiSectionProps> = ({
  activeTab,
}) => {
  const { data: users, isLoading, isError } = useUsers();
  const theme = useTheme();

  const counts = useMemo(() => {
    if (!users) return { users: 0, admins: 0, superAdmins: 0 };
    const userCount = users.filter((u) => u.role === SystemRole.USER).length;
    const adminCount = users.filter((u) => u.role === SystemRole.ADMIN).length;
    const superAdminCount = users.filter(
      (u) => u.role === SystemRole.SUPERADMIN
    ).length;
    return {
      users: userCount,
      admins: adminCount,
      superAdmins: superAdminCount,
    };
  }, [users]);

  if (activeTab === "usuarios") {
    return (
      <Stack direction="row" spacing={2}>
        <KpiSummaryCard
          title={KPI_LABELS.usuarios}
          color={theme.palette.roleColors[SystemRole.USER]}
          Icon={PeopleOutlined}
          primaryValue={counts.users}
          primaryLabel="Total registrados"
          isLoading={isLoading}
          hasError={isError}
        />
        <KpiSummaryCard
          title={KPI_LABELS.actividad}
          color={theme.palette.success.main}
          Icon={TrendingUpOutlined}
          primaryValue={counts.users}
          primaryLabel="Activos"
          secondaryValue={0}
          secondaryLabel="Inactivos"
          isLoading={isLoading}
          hasError={isError}
        />
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={2}>
      <KpiSummaryCard
        title={KPI_LABELS.administradores}
        color={theme.palette.roleColors[SystemRole.ADMIN]}
        Icon={AdminPanelSettingsOutlined}
        primaryValue={counts.admins}
        primaryLabel="Total registrados"
        isLoading={isLoading}
        hasError={isError}
      />
      <KpiSummaryCard
        title={KPI_LABELS.superAdministradores}
        color={theme.palette.roleColors[SystemRole.SUPERADMIN]}
        Icon={SecurityOutlined}
        primaryValue={counts.superAdmins}
        primaryLabel="Total registrados"
        isLoading={isLoading}
        hasError={isError}
      />
    </Stack>
  );
};
