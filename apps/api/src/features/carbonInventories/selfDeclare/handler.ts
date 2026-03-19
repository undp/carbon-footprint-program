import type { SelfDeclareParams } from "@repo/types";
import { createActionHandler } from "@/handlerFactory/index.js";
import { selfDeclareService } from "./service.js";

export const selfDeclareHandler = createActionHandler<SelfDeclareParams, void>(
  "carbonInventories",
  selfDeclareService,
  "CarbonInventory"
);
