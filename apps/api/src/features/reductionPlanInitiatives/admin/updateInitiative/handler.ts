import type {
  UpdateInitiativeParams,
  UpdateInitiativeRequest,
  UpdateInitiativeResponse,
} from "@repo/types";
import { createPatchHandler } from "@/handlerFactory/index.js";
import { updateInitiativeService } from "./service.js";

export const updateInitiativeHandler = createPatchHandler<
  UpdateInitiativeParams,
  UpdateInitiativeRequest,
  UpdateInitiativeResponse
>("admin-reduction-plan-initiatives", updateInitiativeService, "Initiative");
