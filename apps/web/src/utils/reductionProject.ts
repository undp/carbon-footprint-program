import {
  ReductionProjectDisplayStatus,
  ReductionProjectDisplayStatusEnum,
} from "@repo/types";

const STATUS_LABELS = {
  [ReductionProjectDisplayStatusEnum.DRAFT]: "Borrador",
  [ReductionProjectDisplayStatusEnum.SUBMITTED]: "En revisión",
  [ReductionProjectDisplayStatusEnum.REVIEWED]: "Con observaciones",
  [ReductionProjectDisplayStatusEnum.REJECTED]: "Rechazado",
  [ReductionProjectDisplayStatusEnum.APPROVED]: "Aprobado",
  [ReductionProjectDisplayStatusEnum.DELETED]: "Eliminado",
};

export const getReductionProjectStatusLabel = (
  status: ReductionProjectDisplayStatus
) => {
  return STATUS_LABELS[status];
};
