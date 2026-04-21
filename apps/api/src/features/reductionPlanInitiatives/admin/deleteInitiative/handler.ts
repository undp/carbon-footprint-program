import type {
  DeleteInitiativeParams,
  DeleteInitiativeResponse,
} from "@repo/types";
import { createActionHandler } from "@/handlerFactory/index.js";
import { deleteInitiativeService } from "./service.js";

export const deleteInitiativeHandler = createActionHandler<
  DeleteInitiativeParams,
  DeleteInitiativeResponse
>("admin-reduction-plan-initiatives", deleteInitiativeService, "Initiative");
