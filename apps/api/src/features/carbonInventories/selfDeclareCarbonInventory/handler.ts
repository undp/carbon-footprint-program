import type { SelfDeclareCarbonInventoryParams } from "@repo/types";
import { createActionHandler } from "@/handlerFactory/index.js";
import { selfDeclareCarbonInventoryService } from "./service.js";

export const selfDeclareCarbonInventoryHandler = createActionHandler<
  SelfDeclareCarbonInventoryParams,
  void
>("carbonInventories", selfDeclareCarbonInventoryService, "CarbonInventory");
