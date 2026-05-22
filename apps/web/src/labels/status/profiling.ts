import { StatusConfig, StatusFamily } from "./types";

export type ProfilingStatusKey = "ACTIVE" | "DELETED" | "NEW";

export const PROFILING_STATUS_CONFIG_MASCULINE: Record<
  ProfilingStatusKey,
  StatusConfig
> = {
  ACTIVE: {
    family: StatusFamily.POSITIVE,
    label: "Activo",
    tooltip: "Registro activo y disponible",
    sortOrder: 0,
  },
  DELETED: {
    family: StatusFamily.NEUTRAL,
    label: "Eliminado",
    tooltip: "Registro eliminado",
    sortOrder: 2,
  },
  NEW: {
    family: StatusFamily.IN_REVIEW,
    label: "Nuevo",
    tooltip: "Registro nuevo (sin guardar)",
    sortOrder: 1,
  },
};

export const PROFILING_STATUS_CONFIG_FEMININE: Record<
  ProfilingStatusKey,
  StatusConfig
> = {
  ACTIVE: {
    family: StatusFamily.POSITIVE,
    label: "Activa",
    tooltip: "Registro activo y disponible",
    sortOrder: 0,
  },
  DELETED: {
    family: StatusFamily.NEUTRAL,
    label: "Eliminada",
    tooltip: "Registro eliminado",
    sortOrder: 2,
  },
  NEW: {
    family: StatusFamily.IN_REVIEW,
    label: "Nueva",
    tooltip: "Registro nuevo (sin guardar)",
    sortOrder: 1,
  },
};
