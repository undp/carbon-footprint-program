import { createPatchHandler } from "@/handlerFactory/index.js";
import { updateCarbonInventoryService } from "./service.js";
import type {
  UpdateCarbonInventoryRequest,
  UpdateCarbonInventoryResponse,
} from "@repo/types";

interface UpdateCarbonInventoryParams {
  id: string;
}

export const updateCarbonInventoryHandler = createPatchHandler<
  UpdateCarbonInventoryParams,
  UpdateCarbonInventoryRequest,
  UpdateCarbonInventoryResponse
>("carbonInventories", updateCarbonInventoryService, "Carbon inventory");
