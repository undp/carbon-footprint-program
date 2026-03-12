import { createDeleteHandler } from "@/handlerFactory/index.js";
import { deleteCarbonInventoryService } from "./service.js";

interface DeleteCarbonInventoryParams {
  id: string;
}

export const deleteCarbonInventoryHandler =
  createDeleteHandler<DeleteCarbonInventoryParams>(
    "carbonInventories",
    deleteCarbonInventoryService,
    "Carbon inventory"
  );
