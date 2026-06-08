import { StatusConfig, StatusFamily } from "./types";

export type BadgeActivationStatus = "ACTIVE" | "INACTIVE";

export const BADGE_STATUS_CONFIG: Record<BadgeActivationStatus, StatusConfig> =
  {
    ACTIVE: {
      family: StatusFamily.POSITIVE,
      label: "Activo",
      tooltip: "Sello activo y disponible",
      sortOrder: 0,
    },
    INACTIVE: {
      family: StatusFamily.NEUTRAL,
      label: "Inactivo",
      tooltip: "Sello inactivo",
      sortOrder: 1,
    },
  };
