import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getCarbonInventoriesMinimalService } from "./service.js";
import { GetCarbonInventoriesMinimalResponse } from "@repo/types";

export const getCarbonInventoriesMinimalHandler =
  createGetAllHandler<GetCarbonInventoriesMinimalResponse>(
    "carbonInventoriesMinimal",
    getCarbonInventoriesMinimalService,
    "Carbon inventories minimal data",
    false
  );
