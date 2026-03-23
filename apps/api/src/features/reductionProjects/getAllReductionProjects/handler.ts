import type {
  GetAllReductionProjectsResponse,
  GetAllReductionProjectsQuery,
} from "@repo/types";
import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllReductionProjectsService } from "./service.js";

export const getAllReductionProjectsHandler = createGetAllHandler<
  GetAllReductionProjectsResponse,
  GetAllReductionProjectsQuery
>(
  "reductionProjects",
  getAllReductionProjectsService,
  "Reduction projects",
  false
);
