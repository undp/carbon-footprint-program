import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAvailableYearsService } from "./service.js";
import { CarbonInventoryAvailableYearsResponse } from "@repo/types";

export const getAvailableYearsHandler =
  createGetAllHandler<CarbonInventoryAvailableYearsResponse>(
    "carbonInventoriesAvailableYears",
    getAvailableYearsService,
    "Carbon inventories available years",
    false // Don't treat empty array as not found
  );
