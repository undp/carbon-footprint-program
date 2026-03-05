import type { RequestVerificationParams } from "@repo/types";
import { createActionHandler } from "@/handlerFactory/index.js";
import { requestVerificationService } from "./service.js";

export const requestVerificationHandler = createActionHandler<
  RequestVerificationParams,
  void
>("carbonInventories", requestVerificationService, "CarbonInventory");
