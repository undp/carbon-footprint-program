import { FC } from "react";
import { useTheme } from "@mui/material";
import { SystemRole } from "@repo/types";
import { BaseChip } from "./BaseChip";
import { SYSTEM_ROLE_LABELS } from "@/labels/chips/role";

interface SystemRoleChipProps {
  role: SystemRole;
}

export const SystemRoleChip: FC<SystemRoleChipProps> = ({ role }) => {
  const theme = useTheme();
  const { label, tooltip } = SYSTEM_ROLE_LABELS[role];

  return (
    <BaseChip
      color={theme.palette.roleColors[role]}
      label={label}
      tooltip={tooltip}
    />
  );
};
