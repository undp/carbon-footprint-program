import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllJobPositionsService } from "./getAllJobPositionsService.js";

export const getAllJobPositionsHandler = createGetAllHandler(
  "jobPositions",
  getAllJobPositionsService,
  "Job positions"
);
