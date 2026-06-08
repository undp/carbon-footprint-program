import { StatusConfig, StatusFamily } from "./types";

export type ProfilingStatusKey = "ACTIVE" | "DELETED" | "NEW";

/**
 * Maps any profiling-domain status (sector / subsector / main activity /
 * organization size — all share ACTIVE/DELETED values) to a config key.
 * Rows without a persisted status (new/unsaved) fall back to NEW.
 */
export const resolveProfilingStatusKey = (
  status: string | null | undefined
): ProfilingStatusKey =>
  status === "ACTIVE" ? "ACTIVE" : status === "DELETED" ? "DELETED" : "NEW";

export const PROFILING_STATUS_CONFIG: Record<ProfilingStatusKey, StatusConfig> =
  {
    ACTIVE: {
      family: StatusFamily.POSITIVE,
      label: "Activo",
      tooltip: "Registro activo y disponible",
    },
    DELETED: {
      family: StatusFamily.NEUTRAL,
      label: "Eliminado",
      tooltip: "Registro eliminado",
    },
    NEW: {
      family: StatusFamily.IN_REVIEW,
      label: "Nuevo",
      tooltip: "Registro nuevo (sin guardar)",
    },
  };
