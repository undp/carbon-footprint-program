import {
  CountryOrganizationSizeStatus,
  CountrySectorStatus,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
} from "@repo/types";
import { StatusConfig, StatusFamily } from "./types";

export enum ProfilingStatusKey {
  ACTIVE = "ACTIVE",
  DELETED = "DELETED",
  NEW = "NEW",
}

/** Any profiling-domain status — the four enums share the same value set. */
export type ProfilingDomainStatus =
  | CountrySectorStatus
  | CountrySubsectorStatus
  | OrganizationMainActivityStatus
  | CountryOrganizationSizeStatus;

/**
 * Maps any profiling-domain status (sector / subsector / main activity /
 * organization size — all share ACTIVE/DELETED values) to a config key.
 * Rows without a persisted status (new/unsaved) fall back to NEW.
 */
export const resolveProfilingStatusKey = (
  status: ProfilingDomainStatus | null | undefined
): ProfilingStatusKey => {
  if (status === "ACTIVE") return ProfilingStatusKey.ACTIVE;
  if (status === "DELETED") return ProfilingStatusKey.DELETED;
  return ProfilingStatusKey.NEW;
};

export const PROFILING_STATUS_CONFIG: Record<ProfilingStatusKey, StatusConfig> =
  {
    [ProfilingStatusKey.ACTIVE]: {
      family: StatusFamily.POSITIVE,
      label: "Activo",
      tooltip: "Registro activo y disponible",
    },
    [ProfilingStatusKey.DELETED]: {
      family: StatusFamily.NEUTRAL,
      label: "Eliminado",
      tooltip: "Registro eliminado",
    },
    [ProfilingStatusKey.NEW]: {
      family: StatusFamily.IN_REVIEW,
      label: "Nuevo",
      tooltip: "Registro nuevo (sin guardar)",
    },
  };
