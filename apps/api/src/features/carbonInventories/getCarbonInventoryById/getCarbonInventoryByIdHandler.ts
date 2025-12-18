import { createGetByIdHandler } from "@/handlerFactory/index.js";
import { getCarbonInventoryByIdService } from "./getCarbonInventoryByIdService.js";

export const getCarbonInventoryByIdHandler = createGetByIdHandler(
  "carbonInventories",
  getCarbonInventoryByIdService,
  "Carbon inventory"
);
