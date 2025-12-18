import { createPostHandler } from "@/handlerFactory/index.js";
import { createCarbonInventoryService } from "./createCarbonInventoryService.js";
import type {
  CreateCarbonInventoryRequest,
  CreateCarbonInventoryResponse,
} from "@repo/types";

export const createCarbonInventoryHandler = createPostHandler<
  CreateCarbonInventoryRequest,
  CreateCarbonInventoryResponse
>("carbonInventories", createCarbonInventoryService, "Carbon inventory");
