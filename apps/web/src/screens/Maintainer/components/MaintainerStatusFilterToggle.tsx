import { FC } from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { AdminListStatusFilter } from "@repo/types";

interface Props {
  value: AdminListStatusFilter;
  onChange: (next: AdminListStatusFilter) => void;
}

/**
 * Tri-state toggle (Activos / Eliminados / Todos) used by the four profiling maintainer
 * screens. Hosted in the `MaintainerPageHeader`'s `extra` slot.
 */
export const MaintainerStatusFilterToggle: FC<Props> = ({
  value,
  onChange,
}) => (
  <ToggleButtonGroup
    value={value}
    exclusive
    size="small"
    onChange={(_, next: AdminListStatusFilter | null) => {
      if (next !== null) {
        onChange(next);
      }
    }}
  >
    <ToggleButton value="active">Activos</ToggleButton>
    <ToggleButton value="deleted">Eliminados</ToggleButton>
    <ToggleButton value="all">Todos</ToggleButton>
  </ToggleButtonGroup>
);
