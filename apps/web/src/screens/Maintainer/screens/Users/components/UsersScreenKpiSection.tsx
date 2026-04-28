import { FC, useMemo } from "react";
import { Stack, useTheme } from "@mui/material";
import {
  PeopleOutlined,
  AdminPanelSettingsOutlined,
} from "@mui/icons-material";
import { SystemRole } from "@repo/types";
import { useUsers } from "@/api/query/users";
import { KpiSummaryCard } from "@/screens/AdminDashboard/components/KpiSummaryCard";
import { KPI_LABELS } from "../constants";

export const UsersScreenKpiSection: FC = () => {
  const { data: users, isLoading, isError } = useUsers();
  const theme = useTheme();

  const counts = useMemo(() => {
    if (!users)
      return { total: 0, usuarios: 0, administradores: 0, superAdmins: 0 };
    const usuarios = users.filter((u) => u.role === SystemRole.USER).length;
    const superAdmins = users.filter(
      (u) => u.role === SystemRole.SUPERADMIN
    ).length;
    const administradores = users.length - usuarios;
    return { total: users.length, usuarios, administradores, superAdmins };
  }, [users]);

  return (
    <Stack direction="row" spacing={2}>
      <KpiSummaryCard
        title={KPI_LABELS.usuarios}
        color={theme.palette.roleColors[SystemRole.USER]}
        Icon={PeopleOutlined}
        primaryValue={counts.usuarios}
        primaryLabel="Regulares"
        secondaryValue={counts.total}
        secondaryLabel="Total"
        isLoading={isLoading}
        hasError={isError}
      />
      <KpiSummaryCard
        title={KPI_LABELS.administradores}
        color={theme.palette.roleColors[SystemRole.ADMIN]}
        Icon={AdminPanelSettingsOutlined}
        primaryValue={counts.administradores}
        primaryLabel="Administradores"
        secondaryValue={counts.superAdmins}
        secondaryLabel="Super Administradores"
        isLoading={isLoading}
        hasError={isError}
      />
    </Stack>
  );
};
