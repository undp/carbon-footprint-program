import type {
  CreateReductionPlanInitiativeRequest,
  CreateReductionPlanInitiativeResponse,
} from "@repo/types";
import { createPostHandler } from "@/handlerFactory/index.js";
import { createReductionPlanInitiativeService } from "./service.js";

export const createReductionPlanInitiativeHandler = createPostHandler<
  CreateReductionPlanInitiativeRequest,
  CreateReductionPlanInitiativeResponse
>(
  "admin-reduction-plan-initiatives",
  createReductionPlanInitiativeService,
  "Reduction plan initiative"
);
