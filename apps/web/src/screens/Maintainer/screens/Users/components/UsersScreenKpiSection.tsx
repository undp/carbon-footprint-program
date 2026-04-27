import { FC, useMemo } from "react";
import { Stack, useTheme } from "@mui/material";
import {
  PeopleOutlined,
  AdminPanelSettingsOutlined,
} from "@mui/icons-material";
import { SystemRole } from "@repo/types";
import { useUsers } from "@/api/query/users";
import { RequestScreenKpiCard } from "@/screens/Maintainer/components/RequestScreenKpiCard";
import { RequestScreenKpiCardSkeleton } from "@/screens/Maintainer/components/RequestScreenKpiCardSkeleton";
import { KPI_LABELS, SUPERADMIN_COUNT_SUBTITLE } from "../constants";

export const UsersScreenKpiSection: FC = () => {
  const { data: users, isLoading } = useUsers();
  const theme = useTheme();

  const counts = useMemo(() => {
    if (!users) return { usuarios: 0, administradores: 0, superAdmins: 0 };
    const usuarios = users.filter((u) => u.role === SystemRole.USER).length;
    const superAdmins = users.filter(
      (u) => u.role === SystemRole.SUPERADMIN
    ).length;
    const administradores = users.length - usuarios;
    return { usuarios, administradores, superAdmins };
  }, [users]);

  if (isLoading) {
    return (
      <Stack direction="row" spacing={2}>
        <RequestScreenKpiCardSkeleton />
        <RequestScreenKpiCardSkeleton />
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={2}>
      <RequestScreenKpiCard
        label={KPI_LABELS.usuarios}
        color={theme.palette.roleColors[SystemRole.USER]}
        Icon={PeopleOutlined}
        value={counts.usuarios}
      />
      <RequestScreenKpiCard
        label={`${KPI_LABELS.administradores} · ${SUPERADMIN_COUNT_SUBTITLE(counts.superAdmins)}`}
        color={theme.palette.roleColors[SystemRole.ADMIN]}
        Icon={AdminPanelSettingsOutlined}
        value={counts.administradores}
      />
    </Stack>
  );
};
