import { FC } from "react";
import { SystemRole } from "@repo/types";
import { CustomPaletteChip } from "./CustomPaletteChip";
import { useSystemRoleConfig } from "@/labels/status/role";

interface SystemRoleChipProps {
  role: SystemRole;
}

export const SystemRoleChip: FC<SystemRoleChipProps> = ({ role }) => {
  const config = useSystemRoleConfig(role);
  return <CustomPaletteChip config={config} />;
};
