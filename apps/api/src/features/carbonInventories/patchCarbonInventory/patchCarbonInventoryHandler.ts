import { createPatchHandler } from "@/handlerFactory/index.js";
import { patchCarbonInventoryService } from "./patchCarbonInventoryService.js";
import type {
  UpdateCarbonInventoryRequest,
  UpdateCarbonInventoryResponse,
} from "@repo/types";

interface PatchCarbonInventoryParams {
  id: string;
}

export const patchCarbonInventoryHandler = createPatchHandler<
  PatchCarbonInventoryParams,
  UpdateCarbonInventoryRequest,
  UpdateCarbonInventoryResponse
>("carbonInventories", patchCarbonInventoryService, "Carbon inventory");
