import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllCarbonInventoriesService } from "./service.js";
import type {
  GetAllCarbonInventoriesResponse,
  GetAllCarbonInventoriesQuery,
} from "@repo/types";

export const getAllCarbonInventoriesHandler = createGetAllHandler<
  GetAllCarbonInventoriesResponse,
  GetAllCarbonInventoriesQuery
>(
  "carbonInventories",
  getAllCarbonInventoriesService,
  "Carbon inventories",
  false // Don't treat empty array as not found
);
