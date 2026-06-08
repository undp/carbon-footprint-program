import { StatusConfig, StatusFamily } from "./types";

export type ProfilingStatusKey = "ACTIVE" | "DELETED" | "NEW";

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
