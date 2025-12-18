import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllCarbonInventoriesService } from "./getAllCarbonInventoriesService.js";

export const getAllCarbonInventoriesHandler = createGetAllHandler(
  "carbonInventories",
  getAllCarbonInventoriesService,
  "Carbon inventories",
  false // We don't want to throw an error if no carbon inventories are found
);
