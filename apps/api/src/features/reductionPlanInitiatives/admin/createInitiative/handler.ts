import type {
  CreateInitiativeRequest,
  CreateInitiativeResponse,
} from "@repo/types";
import { createPostHandler } from "@/handlerFactory/index.js";
import { createInitiativeService } from "./service.js";

export const createInitiativeHandler = createPostHandler<
  CreateInitiativeRequest,
  CreateInitiativeResponse
>("admin-reduction-plan-initiatives", createInitiativeService, "Initiative");
