import { StatusConfig, StatusFamily } from "./types";

export enum BadgeActivationStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export const BADGE_STATUS_CONFIG: Record<BadgeActivationStatus, StatusConfig> =
  {
    [BadgeActivationStatus.ACTIVE]: {
      family: StatusFamily.POSITIVE,
      label: "Activo",
      tooltip: "Sello activo y disponible",
    },
    [BadgeActivationStatus.INACTIVE]: {
      family: StatusFamily.NEUTRAL,
      label: "Inactivo",
      tooltip: "Sello inactivo",
    },
  };
