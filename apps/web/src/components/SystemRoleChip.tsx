import { FC, useMemo } from "react";
import { useTheme } from "@mui/material";
import { SystemRole } from "@repo/types";
import { CustomPaletteChip } from "./CustomPaletteChip";
import { SYSTEM_ROLE_LABELS } from "@/labels/chips/role";
import type { CustomPaletteConfig } from "@/labels/chips/types";

interface SystemRoleChipProps {
  role: SystemRole;
}

export const SystemRoleChip: FC<SystemRoleChipProps> = ({ role }) => {
  const theme = useTheme();
  const config = useMemo<CustomPaletteConfig>(
    () => ({
      ...SYSTEM_ROLE_LABELS[role],
      color: theme.palette.roleColors[role],
    }),
    [role, theme]
  );
  return <CustomPaletteChip config={config} />;
};
