import { createDeleteHandler } from "@/handlerFactory/index.js";
import { deleteCarbonInventoryService } from "./service.js";
import { DeleteCarbonInventoryParams } from "@repo/types";

export const deleteCarbonInventoryHandler =
  createDeleteHandler<DeleteCarbonInventoryParams>(
    "carbonInventories",
    deleteCarbonInventoryService,
    "Carbon inventory"
  );
