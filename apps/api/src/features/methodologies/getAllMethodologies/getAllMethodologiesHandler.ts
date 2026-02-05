import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllMethodologiesService } from "./getAllMethodologiesService.js";
import type { GetAllMethodologiesResponse } from "@repo/types";

export const getAllMethodologiesHandler = createGetAllHandler<
  GetAllMethodologiesResponse
>(
  "methodologies",
  getAllMethodologiesService,
  "Methodologies",
  false // Don't treat empty array as not found
);
