import { createPostHandler } from "@/handlerFactory/index.js";
import { createCarbonInventoryService } from "./createCarbonInventoryService.js";
import type { CreateCarbonInventoryRequest } from "@repo/types";

export const createCarbonInventoryHandler = createPostHandler<
  CreateCarbonInventoryRequest,
  Awaited<ReturnType<typeof createCarbonInventoryService>>
>("carbonInventories", createCarbonInventoryService, "Carbon inventory");
