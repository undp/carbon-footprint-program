import type {
  UpdateReductionPlanInitiativeParams,
  UpdateReductionPlanInitiativeRequest,
  UpdateReductionPlanInitiativeResponse,
} from "@repo/types";
import { createPatchHandler } from "@/handlerFactory/index.js";
import { updateReductionPlanInitiativeService } from "./service.js";

export const updateReductionPlanInitiativeHandler = createPatchHandler<
  UpdateReductionPlanInitiativeParams,
  UpdateReductionPlanInitiativeRequest,
  UpdateReductionPlanInitiativeResponse
>(
  "admin-reduction-plan-initiatives",
  updateReductionPlanInitiativeService,
  "Reduction plan initiative"
);
