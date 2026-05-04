import { FC, useMemo } from "react";
import { Stack, useTheme } from "@mui/material";
import {
  PeopleOutlined,
  AdminPanelSettingsOutlined,
  TrendingUpOutlined,
  SecurityOutlined,
} from "@mui/icons-material";
import { SystemParameterKeyEnum, SystemRole } from "@repo/types";
import { useUsers } from "@/api/query/users";
import { useSystemParameters } from "@/api/query/systemParameters";
import { KpiSummaryCard } from "@/screens/AdminDashboard/components/KpiSummaryCard";
import { KPI_LABELS, type TabKey } from "../constants";

interface UsersScreenKpiSectionProps {
  activeTab: TabKey;
}

export const UsersScreenKpiSection: FC<UsersScreenKpiSectionProps> = ({
  activeTab,
}) => {
  const { data: users, isLoading, isError } = useUsers();
  const { data: systemParameters } = useSystemParameters([
    SystemParameterKeyEnum.USER_INACTIVE_THRESHOLD_DAYS,
  ]);
  const theme = useTheme();

  const thresholdDays = useMemo(() => {
    if (!systemParameters) return null;
    const param = systemParameters.find(
      (p) => p.key === SystemParameterKeyEnum.USER_INACTIVE_THRESHOLD_DAYS
    );
    const parsed = parseInt(param?.value ?? "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(
        `${SystemParameterKeyEnum.USER_INACTIVE_THRESHOLD_DAYS} no está configurado`
      );
    }
    return parsed;
  }, [systemParameters]);

  const counts = useMemo(() => {
    if (!users)
      return { users: 0, active: 0, inactive: 0, admins: 0, superAdmins: 0 };
    const regularUsers = users.filter((u) => u.role === SystemRole.USER);
    const activeCount = regularUsers.filter((u) => u.active).length;
    const adminCount = users.filter((u) => u.role === SystemRole.ADMIN).length;
    const superAdminCount = users.filter(
      (u) => u.role === SystemRole.SUPERADMIN
    ).length;
    return {
      users: regularUsers.length,
      active: activeCount,
      inactive: regularUsers.length - activeCount,
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
          primaryValue={counts.active}
          primaryLabel={`Activos (últimos ${thresholdDays} días)`}
          secondaryValue={counts.inactive}
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
