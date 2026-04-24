import type {
  DeleteReductionPlanInitiativeParams,
  DeleteReductionPlanInitiativeResponse,
} from "@repo/types";
import { createActionHandler } from "@/handlerFactory/index.js";
import { deleteReductionPlanInitiativeService } from "./service.js";

export const deleteReductionPlanInitiativeHandler = createActionHandler<
  DeleteReductionPlanInitiativeParams,
  DeleteReductionPlanInitiativeResponse
>(
  "admin-reduction-plan-initiatives",
  deleteReductionPlanInitiativeService,
  "Reduction plan initiative"
);
