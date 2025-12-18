import { createGetByIdHandler } from "@/handlerFactory/index.js";
import { getCarbonInventoryByIdService } from "./getCarbonInventoryByIdService.js";
import type { GetCarbonInventoryByIdResponse } from "@repo/types";

export const getCarbonInventoryByIdHandler =
  createGetByIdHandler<GetCarbonInventoryByIdResponse>(
    "carbonInventories",
    getCarbonInventoryByIdService,
    "Carbon inventory"
  );
