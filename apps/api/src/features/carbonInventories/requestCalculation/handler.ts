import type { RequestCalculationParams } from "@repo/types";
import { createActionHandler } from "@/handlerFactory/index.js";
import { requestCalculationService } from "./service.js";

export const requestCalculationHandler = createActionHandler<
  RequestCalculationParams,
  void
>("carbonInventories", requestCalculationService, "CarbonInventory");
