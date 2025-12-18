import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllCarbonInventoriesService } from "./getAllCarbonInventoriesService.js";
import type { GetAllCarbonInventoriesResponse } from "@repo/types";

export const getAllCarbonInventoriesHandler =
  createGetAllHandler<GetAllCarbonInventoriesResponse>(
    "carbonInventories",
    getAllCarbonInventoriesService,
    "Carbon inventories",
    false // We don't want to throw an error if no carbon inventories are found
  );
