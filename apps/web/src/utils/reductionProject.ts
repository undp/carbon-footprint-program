import { ReductionProjectDisplayStatus } from "@repo/types";
import { REDUCTION_PROJECT_STATUS_CONFIG } from "@/labels/status/reductionProject";

export const getReductionProjectStatusLabel = (
  status: ReductionProjectDisplayStatus
): string => REDUCTION_PROJECT_STATUS_CONFIG[status].label;
