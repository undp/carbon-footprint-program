import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllJobPositionsService } from "./getAllJobPositionsService.js";
import type { GetAllJobPositionsResponse } from "@repo/types";

export const getAllJobPositionsHandler =
  createGetAllHandler<GetAllJobPositionsResponse>(
    "jobPositions",
    getAllJobPositionsService,
    "Job positions"
  );
